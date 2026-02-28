import { NextRequest, NextResponse } from 'next/server';
import { extractEntities, generateThreatBrief } from '@/lib/openai-client';
import { extractStructuredThreatData } from '@/lib/fastino';
import { analyzeThreatScreenshot } from '@/lib/reka';
import { search as tavilySearch, extract as tavilyExtract } from '@/lib/tavily';
import { mergeNode, createRelationship, runQuery } from '@/lib/neo4j';
import type { GraphNode, GraphEdge, FeedItem, PipelineResult, NodeType, RelationshipType } from '@/lib/types';

// Map entity type to the key property for Neo4j MERGE
const NODE_KEY_MAP: Record<string, string> = {
  ThreatActor: 'name',
  Vulnerability: 'cve_id',
  Exploit: 'name',
  Software: 'name',
  Organization: 'name',
  Malware: 'name',
  Campaign: 'name',
  AttackTechnique: 'mitre_id',
};

const VALID_LABELS = new Set([
  'ThreatActor', 'Vulnerability', 'Exploit', 'Software',
  'Organization', 'Malware', 'Campaign', 'AttackTechnique',
]);

export async function POST(req: NextRequest) {
  try {
    // Validate internal API secret to prevent unauthenticated writes
    const secret = req.headers.get('x-pipeline-secret');
    if (process.env.PIPELINE_SECRET && secret !== process.env.PIPELINE_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { scoutUpdate } = body;

    if (!scoutUpdate) {
      return NextResponse.json(
        { success: false, error: 'scoutUpdate is required' },
        { status: 400 }
      );
    }

    const newNodes: GraphNode[] = [];
    const newEdges: GraphEdge[] = [];
    const feedItems: FeedItem[] = [];

    // ---------------------------------------------------------------
    // Step 1: Extract entities (Yutori JSON → fallback to GLiNER + OpenAI in parallel)
    // ---------------------------------------------------------------
    let extracted: { entities: any[]; relationships: any[]; iocs: any[] };
    let glinerExtracted: { entities: any[]; relationships: any[]; iocs: any[] } | null = null;
    try {
      try {
        const parsed = typeof scoutUpdate === 'string' ? JSON.parse(scoutUpdate) : scoutUpdate;
        if (parsed && parsed.entities && Array.isArray(parsed.entities)) {
          console.log('[pipeline] Using native Yutori structured output');
          extracted = {
            entities: parsed.entities || [],
            relationships: parsed.relationships || [],
            iocs: parsed.iocs || []
          };
        } else {
          throw new Error('Not structured threat intelligence JSON');
        }
      } catch (parseErr) {
        // Step 1b+1c: Run GLiNER and OpenAI extraction in parallel
        console.log('[pipeline] Running GLiNER + OpenAI extraction in parallel');
        const rawText = typeof scoutUpdate === 'string' ? scoutUpdate : JSON.stringify(scoutUpdate);

        const [glinerResult, openaiResult] = await Promise.allSettled([
          extractStructuredThreatData(rawText),
          extractEntities(rawText),
        ]);

        const openaiData = openaiResult.status === 'fulfilled' ? openaiResult.value : null;
        const glinerData = glinerResult.status === 'fulfilled' ? glinerResult.value : null;

        if (glinerData) {
          glinerExtracted = glinerData;
          console.log(`[pipeline] GLiNER extracted ${glinerData.entities.length} entities`);
        }

        if (!openaiData && !glinerData) {
          throw new Error('Both GLiNER and OpenAI extraction failed');
        }

        // Step 1d: Merge results — union + dedup by name (keep highest confidence / first seen)
        const mergedEntities = new Map<string, any>();
        const mergedRels: any[] = [];
        const mergedIocs = new Map<string, any>();

        // Add OpenAI entities first (higher detail)
        if (openaiData) {
          for (const e of openaiData.entities) mergedEntities.set(e.name.toLowerCase(), e);
          mergedRels.push(...openaiData.relationships);
          for (const ioc of openaiData.iocs) mergedIocs.set(`${ioc.type}:${ioc.value}`, ioc);
        }

        // Merge GLiNER entities (add new ones, don't overwrite existing)
        if (glinerData) {
          for (const e of glinerData.entities) {
            if (!mergedEntities.has(e.name.toLowerCase())) {
              mergedEntities.set(e.name.toLowerCase(), e);
            }
          }
          for (const rel of glinerData.relationships) {
            const key = `${rel.source}-${rel.target}-${rel.relationship}`;
            if (!mergedRels.some(r => `${r.source}-${r.target}-${r.relationship}` === key)) {
              mergedRels.push(rel);
            }
          }
          for (const ioc of glinerData.iocs) {
            const key = `${ioc.type}:${ioc.value}`;
            if (!mergedIocs.has(key)) mergedIocs.set(key, ioc);
          }
        }

        extracted = {
          entities: Array.from(mergedEntities.values()),
          relationships: mergedRels,
          iocs: Array.from(mergedIocs.values()),
        };
        console.log(`[pipeline] Merged extraction: ${extracted.entities.length} entities, ${extracted.relationships.length} rels, ${extracted.iocs.length} IOCs`);
      }
    } catch (err) {
      console.warn('[pipeline] Entity extraction failed, using raw content:', err);
      // Return minimal result if extraction fails
      feedItems.push({
        id: `feed-${Date.now()}`,
        timestamp: new Date().toISOString(),
        severity: 'info',
        source: 'system',
        title: 'Raw scout update received',
        description: typeof scoutUpdate === 'string' ? scoutUpdate.slice(0, 300) : JSON.stringify(scoutUpdate).slice(0, 300),
      });
      return NextResponse.json({
        success: true,
        newNodes,
        newEdges,
        threatBrief: undefined,
        feedItems,
      });
    }

    // ---------------------------------------------------------------
    // Step 2: Enrich CVEs with Tavily search for latest news
    // ---------------------------------------------------------------
    const cveEntities = extracted.entities.filter(
      (e) => e.type === 'Vulnerability' && e.cve_id
    );
    // source_url may come from Yutori structured output, not from OpenAI extraction
    const sourceUrls: string[] = extracted.entities
      .map((e) => (e as Record<string, unknown>).source_url as string | undefined)
      .filter((url): url is string => !!url);

    // Run enrichment in parallel — skip on failure
    const [tavilyResults, extractedContent] = await Promise.all([
      // Search for CVE news
      Promise.all(
        cveEntities.slice(0, 5).map(async (cve) => {
          try {
            const results = await tavilySearch(`${cve.cve_id} vulnerability exploit`, {
              search_depth: 'advanced',
              max_results: 3,
            });
            return { cveId: cve.cve_id!, results: results.results };
          } catch {
            return { cveId: cve.cve_id!, results: [] };
          }
        })
      ),
      // Extract IOCs from source URLs
      sourceUrls.length > 0
        ? tavilyExtract(sourceUrls.slice(0, 10)).catch(() => ({ results: [], failed_results: [] }))
        : Promise.resolve({ results: [], failed_results: [] }),
    ]);

    // ---------------------------------------------------------------
    // Step 2.5: Reka screenshot analysis (if screenshot URLs present)
    // ---------------------------------------------------------------
    const screenshotUrls: string[] = extracted.entities
      .map((e: Record<string, unknown>) => e.screenshot_url as string | undefined)
      .filter((url): url is string => !!url);

    if (screenshotUrls.length > 0) {
      console.log(`[pipeline] Analyzing ${screenshotUrls.length} screenshots with Reka Vision (parallel)`);
      const rekaResults = await Promise.allSettled(
        screenshotUrls.slice(0, 3).map((url) => analyzeThreatScreenshot(url))
      );
      for (const result of rekaResults) {
        if (result.status === 'fulfilled') {
          const analysis = result.value;
          if (analysis.entitiesFound.length > 0) {
            feedItems.push({
              id: `feed-reka-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              timestamp: new Date().toISOString(),
              severity: analysis.riskLevel === 'none' ? 'info' : analysis.riskLevel as FeedItem['severity'],
              source: 'reka',
              title: `Reka Vision: ${analysis.isPhishing ? 'Phishing detected' : analysis.analysisType} analysis`,
              description: analysis.summary.slice(0, 200),
            });
          }
        } else {
          console.warn('[pipeline] Reka screenshot analysis failed:', result.reason);
        }
      }
    }

    // ---------------------------------------------------------------
    // Step 3: Deep extraction from Tavily content (GLiNER + OpenAI)
    // ---------------------------------------------------------------
    let deepEntities: typeof extracted | null = null;
    const rawExtracts = extractedContent.results.map((r) => r.raw_content).join('\n\n');
    if (rawExtracts.length > 100) {
      try {
        // Run GLiNER and OpenAI deep extraction in parallel
        const [glinerDeep, openaiDeep] = await Promise.allSettled([
          extractStructuredThreatData(rawExtracts.slice(0, 10000)),
          extractEntities(rawExtracts.slice(0, 10000)),
        ]);

        const openaiData = openaiDeep.status === 'fulfilled' ? openaiDeep.value : null;
        const glinerData = glinerDeep.status === 'fulfilled' ? glinerDeep.value : null;

        if (openaiData || glinerData) {
          // Dedup deep entities by name (case-insensitive)
          const deepEntityMap = new Map<string, any>();
          for (const e of [...(openaiData?.entities || []), ...(glinerData?.entities || [])]) {
            if (!deepEntityMap.has(e.name.toLowerCase())) deepEntityMap.set(e.name.toLowerCase(), e);
          }
          // Dedup deep relationships by source-target-relationship key
          const deepRelMap = new Map<string, any>();
          for (const r of [...(openaiData?.relationships || []), ...(glinerData?.relationships || [])]) {
            const key = `${r.source}-${r.target}-${r.relationship}`;
            if (!deepRelMap.has(key)) deepRelMap.set(key, r);
          }
          // Dedup deep IOCs by type:value key
          const deepIocMap = new Map<string, any>();
          for (const ioc of [...(openaiData?.iocs || []), ...(glinerData?.iocs || [])]) {
            const key = `${ioc.type}:${ioc.value}`;
            if (!deepIocMap.has(key)) deepIocMap.set(key, ioc);
          }
          deepEntities = {
            entities: Array.from(deepEntityMap.values()),
            relationships: Array.from(deepRelMap.values()),
            iocs: Array.from(deepIocMap.values()),
          };
          console.log(`[pipeline] Deep extraction: ${deepEntities.entities.length} entities`);
        }
      } catch {
        // Non-critical — skip
      }
    }

    // ---------------------------------------------------------------
    // Step 4: Merge all entities and write to Neo4j
    // ---------------------------------------------------------------
    const allEntities = [
      ...extracted.entities,
      ...(deepEntities?.entities || []),
    ];
    const allRelationships = [
      ...extracted.relationships,
      ...(deepEntities?.relationships || []),
    ];

    // Deduplicate by name (case-insensitive to match Step 1d merge)
    const seenEntities = new Set<string>();
    for (const entity of allEntities) {
      const entityKey = entity.name.toLowerCase();
      if (seenEntities.has(entityKey)) continue;
      seenEntities.add(entityKey);

      if (!VALID_LABELS.has(entity.type)) continue;

      const key = NODE_KEY_MAP[entity.type] || 'name';
      const keyValue = key === 'cve_id' ? (entity.cve_id || entity.name) :
                       key === 'mitre_id' ? (entity.mitre_id || entity.name) :
                       entity.name;

      const props: Record<string, unknown> = { name: entity.name };
      if (entity.cve_id) props.cve_id = entity.cve_id;
      if (entity.cvss != null) props.cvss = entity.cvss;
      if (entity.severity) props.severity = entity.severity;
      if (entity.exploited_in_wild != null) props.exploited_in_wild = entity.exploited_in_wild;
      if (entity.affected_product) props.affected_product = entity.affected_product;
      if (entity.country) props.country = entity.country;
      if (entity.motivation) props.motivation = entity.motivation;
      if (entity.mitre_id) props.mitre_id = entity.mitre_id;
      if (entity.malware_type) props.malware_type = entity.malware_type;
      if (entity.aliases && entity.aliases.length > 0) props.aliases = entity.aliases;

      try {
        await mergeNode(entity.type, key, keyValue, props);
        newNodes.push({
          id: keyValue,
          type: entity.type as NodeType,
          name: entity.name,
          cve_id: entity.cve_id || undefined,
          cvss: entity.cvss ?? undefined,
          severity: entity.severity as GraphNode['severity'],
          exploited_in_wild: entity.exploited_in_wild ?? undefined,
          affected_product: entity.affected_product || undefined,
          country: entity.country || undefined,
          motivation: entity.motivation as GraphNode['motivation'],
          mitre_id: entity.mitre_id || undefined,
          malware_type: entity.malware_type || undefined,
          aliases: entity.aliases,
          isNew: true,
        });
      } catch (err) {
        console.warn(`[pipeline] Failed to merge node ${entity.name}:`, err);
      }
    }

    // Create relationships
    const entityTypeMap = new Map<string, string>();
    for (const entity of allEntities) {
      entityTypeMap.set(entity.name.toLowerCase(), entity.type);
      if (entity.cve_id) entityTypeMap.set(entity.cve_id.toLowerCase(), entity.type);
      if (entity.mitre_id) entityTypeMap.set(entity.mitre_id.toLowerCase(), entity.type);
    }

    for (const rel of allRelationships) {
      const sourceType = entityTypeMap.get(rel.source.toLowerCase());
      const targetType = entityTypeMap.get(rel.target.toLowerCase());
      if (!sourceType || !targetType) continue;
      if (!VALID_LABELS.has(sourceType) || !VALID_LABELS.has(targetType)) continue;

      const sourceKey = NODE_KEY_MAP[sourceType] || 'name';
      const targetKey = NODE_KEY_MAP[targetType] || 'name';

      try {
        await createRelationship(
          sourceType, sourceKey, rel.source,
          targetType, targetKey, rel.target,
          rel.relationship
        );
        newEdges.push({
          id: `edge-${rel.source}-${rel.target}-${rel.relationship}`,
          source: rel.source,
          target: rel.target,
          relationship: rel.relationship as RelationshipType,
        });
      } catch (err) {
        console.warn(`[pipeline] Failed to create relationship ${rel.source}->${rel.target}:`, err);
      }
    }

    // ---------------------------------------------------------------
    // Step 5: Build feed items from findings
    // ---------------------------------------------------------------
    for (const entity of extracted.entities.slice(0, 10)) {
      const severityLevel =
        entity.severity ||
        (entity.cvss && entity.cvss >= 9 ? 'critical' :
         entity.cvss && entity.cvss >= 7 ? 'high' :
         entity.cvss && entity.cvss >= 4 ? 'medium' : 'low');

      const entitySourceUrl = (entity as Record<string, unknown>).source_url as string | undefined;

      feedItems.push({
        id: `feed-${entity.name}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        severity: (severityLevel || 'info') as FeedItem['severity'],
        source: entitySourceUrl?.includes('twitter') ? 'twitter' :
                entitySourceUrl?.includes('github') ? 'github' :
                entitySourceUrl?.includes('nvd') ? 'nvd' : 'news',
        title: entity.type === 'Vulnerability'
          ? `${entity.cve_id || entity.name} — ${entity.severity || 'Unknown'} severity`
          : `${entity.type}: ${entity.name}`,
        description: entity.affected_product
          ? `Affects ${entity.affected_product}${entity.exploited_in_wild ? ' (exploited in the wild)' : ''}`
          : `New ${entity.type.toLowerCase()} detected: ${entity.name}`,
        sourceUrl: entitySourceUrl,
        entities: [{ type: entity.type as NodeType, name: entity.name }],
      });
    }

    // Add Tavily enrichment results as feed items
    for (const tvResult of tavilyResults) {
      for (const result of tvResult.results.slice(0, 1)) {
        feedItems.push({
          id: `feed-tavily-${tvResult.cveId}-${Date.now()}`,
          timestamp: new Date().toISOString(),
          severity: 'info',
          source: 'news',
          title: `${tvResult.cveId}: ${result.title}`,
          description: result.content.slice(0, 200),
          sourceUrl: result.url,
        });
      }
    }

    // ---------------------------------------------------------------
    // Step 6: Get graph context and generate executive threat brief
    // ---------------------------------------------------------------
    let threatBrief = null;
    try {
      // Get a summary of the current graph
      const graphSummary = await runQuery<Record<string, unknown>>(
        `MATCH (n)
         WITH labels(n)[0] AS type, count(n) AS count
         RETURN type, count ORDER BY count DESC`
      );
      const graphContext = graphSummary
        .map((r) => `${r.type}: ${r.count} nodes`)
        .join('\n');

      const newFindings = extracted.entities
        .map((e) => `${e.type}: ${e.name}${e.cve_id ? ` (${e.cve_id})` : ''}${e.severity ? ` [${e.severity}]` : ''}`)
        .join('\n');

      threatBrief = await generateThreatBrief(graphContext, newFindings);
    } catch (err) {
      console.warn('[pipeline] Threat brief generation failed:', err);
    }

    // ---------------------------------------------------------------
    // Step 7: Return the full pipeline result
    // ---------------------------------------------------------------
    const result: PipelineResult & { success: boolean } = {
      success: true,
      newNodes,
      newEdges,
      threatBrief: threatBrief || {
        overall_threat_level: 'elevated',
        headline: 'New threat intelligence processed',
        executive_summary: `Processed ${newNodes.length} entities and ${newEdges.length} relationships from latest scout update.`,
        top_threats: [],
        attack_paths_detected: [],
        cisa_relevant: 'CISA monitoring gap continues — autonomous pipeline active.',
        recommended_actions: ['Review new entities in the knowledge graph'],
      },
      feedItems,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('[pipeline/ingest]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
