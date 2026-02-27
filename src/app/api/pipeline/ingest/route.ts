import { NextRequest, NextResponse } from 'next/server';
import { extractEntities, generateThreatBrief } from '@/lib/openai-client';
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
    // Step 1: Extract entities from the scout update using OpenAI
    // ---------------------------------------------------------------
    let extracted;
    try {
      extracted = await extractEntities(scoutUpdate);
    } catch (err) {
      console.warn('[pipeline] Entity extraction failed, using raw content:', err);
      // Return minimal result if extraction fails
      feedItems.push({
        id: `feed-${Date.now()}`,
        timestamp: new Date().toISOString(),
        severity: 'info',
        source: 'system',
        title: 'Raw scout update received',
        description: scoutUpdate.slice(0, 300),
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
    // Step 3: Deep extraction from Tavily content (if any)
    // ---------------------------------------------------------------
    let deepEntities: typeof extracted | null = null;
    const rawExtracts = extractedContent.results.map((r) => r.raw_content).join('\n\n');
    if (rawExtracts.length > 100) {
      try {
        deepEntities = await extractEntities(rawExtracts.slice(0, 10000));
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

    // Deduplicate by name
    const seenEntities = new Set<string>();
    for (const entity of allEntities) {
      const entityKey = entity.name;
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
      entityTypeMap.set(entity.name, entity.type);
      if (entity.cve_id) entityTypeMap.set(entity.cve_id, entity.type);
      if (entity.mitre_id) entityTypeMap.set(entity.mitre_id, entity.type);
    }

    for (const rel of allRelationships) {
      const sourceType = entityTypeMap.get(rel.source);
      const targetType = entityTypeMap.get(rel.target);
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
