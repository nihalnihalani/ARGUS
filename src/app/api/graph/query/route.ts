import { NextRequest, NextResponse } from 'next/server';
import { runQuery, getFullGraph } from '@/lib/neo4j';
import type { GraphNode, GraphEdge, NodeType, RelationshipType } from '@/lib/types';

// Geo-coordinate lookup for attack arc resolution
const GEO_LOOKUP: Record<string, { lat: number; lon: number }> = {
  // Countries (for ThreatActors by country field)
  Russia: { lat: 55.75, lon: 37.62 },
  China: { lat: 39.90, lon: 116.40 },
  'North Korea': { lat: 39.04, lon: 125.76 },
  Iran: { lat: 35.69, lon: 51.39 },
  'Eastern Europe': { lat: 50.45, lon: 30.52 },
  'United States': { lat: 37.09, lon: -95.71 },
  // Organizations (by name)
  NATO: { lat: 50.85, lon: 4.36 },
  'US Department of Energy': { lat: 38.91, lon: -77.04 },
  Microsoft: { lat: 47.64, lon: -122.13 },
  SolarWinds: { lat: 30.27, lon: -97.74 },
  'Deutsche Industriebank': { lat: 50.11, lon: 8.68 },
  'NHS Digital Trust': { lat: 51.51, lon: -0.13 },
  'EU Cyber Command': { lat: 50.85, lon: 4.35 },
  'Nordic Energy AS': { lat: 59.91, lon: 10.75 },
  'Airbus Defence Systems': { lat: 43.60, lon: 1.44 },
  'Tokyo Stock Exchange': { lat: 35.68, lon: 139.65 },
  'Samsung Semiconductor': { lat: 37.57, lon: 126.98 },
  'Tata Power Grid': { lat: 19.08, lon: 72.88 },
  'Singapore MAS': { lat: 1.35, lon: 103.82 },
  'Australia Defence Signals': { lat: -35.28, lon: 149.13 },
  'Saudi Aramco Digital': { lat: 26.24, lon: 50.04 },
  'Emirates NBD': { lat: 25.20, lon: 55.27 },
  'Petrobras CERT': { lat: -22.91, lon: -43.17 },
  'South Africa Reserve Bank': { lat: -25.75, lon: 28.23 },
  'Maple Leaf Telecom': { lat: 43.65, lon: -79.38 },
};

export async function POST(req: NextRequest) {
  try {
    // Require auth — raw Cypher execution is dangerous
    const secret = req.headers.get('x-pipeline-secret');
    if (process.env.PIPELINE_SECRET && secret !== process.env.PIPELINE_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { cypher, params } = body;

    if (!cypher) {
      return NextResponse.json(
        { success: false, error: 'cypher query is required' },
        { status: 400 }
      );
    }

    // Block destructive operations
    const upper = cypher.toUpperCase();
    if (upper.includes('DELETE') || upper.includes('DROP') || upper.includes('REMOVE')) {
      return NextResponse.json(
        { success: false, error: 'Destructive queries are not allowed' },
        { status: 403 }
      );
    }

    const results = await runQuery(cypher, params);
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('[graph/query]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q')?.trim();

    // If a search query is provided, run a filtered Cypher search
    if (q) {
      const searchCypher = `
        MATCH (n)
        WHERE toLower(n.name) CONTAINS toLower($query)
           OR toLower(coalesce(n.cve_id, '')) CONTAINS toLower($query)
           OR toLower(coalesce(n.description, '')) CONTAINS toLower($query)
           OR any(alias IN coalesce(n.aliases, []) WHERE toLower(alias) CONTAINS toLower($query))
        WITH n
        OPTIONAL MATCH (n)-[r]-(m)
        RETURN collect(DISTINCT {
          id: elementId(n),
          type: labels(n)[0],
          properties: properties(n)
        }) + collect(DISTINCT {
          id: elementId(m),
          type: labels(m)[0],
          properties: properties(m)
        }) AS nodes,
        collect(DISTINCT {
          source: elementId(startNode(r)),
          target: elementId(endNode(r)),
          relationship: type(r)
        }) AS edges
      `;
      const searchRaw = await runQuery<{ nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] }>(searchCypher, { query: q });
      const data = searchRaw[0];
      if (!data) {
        return NextResponse.json({ success: true, nodes: [], edges: [], query: q });
      }

      const seenIds = new Set<string>();
      const nodes: GraphNode[] = data.nodes
        .filter((n) => n.id && !seenIds.has(String(n.id)))
        .map((n) => {
          seenIds.add(String(n.id));
          const props = (n.properties || {}) as Record<string, unknown>;
          const node: GraphNode = {
            id: String(n.id),
            type: String(n.type) as NodeType,
            name: String(props.name || n.id),
            aliases: props.aliases as string[] | undefined,
            country: props.country as string | undefined,
            motivation: props.motivation as GraphNode['motivation'],
            mitre_id: props.mitre_id as string | undefined,
            cve_id: props.cve_id as string | undefined,
            cvss: props.cvss as number | undefined,
            severity: props.severity as GraphNode['severity'],
            exploited_in_wild: props.exploited_in_wild as boolean | undefined,
            affected_product: props.affected_product as string | undefined,
            lat: props.lat as number | undefined,
            lon: props.lon as number | undefined,
            malware_type: props.malware_type as string | undefined,
            uses_ai: props.uses_ai as boolean | undefined,
          };
          if (node.lat == null && node.lon == null) {
            const geo = GEO_LOOKUP[node.name] || (node.country ? GEO_LOOKUP[node.country] : undefined);
            if (geo) { node.lat = geo.lat; node.lon = geo.lon; }
          }
          return node;
        });

      const edges: GraphEdge[] = data.edges
        .filter((e) => e.source && e.target && e.relationship)
        .map((e, i) => ({
          id: `edge-search-${i}`,
          source: String(e.source),
          target: String(e.target),
          relationship: String(e.relationship) as RelationshipType,
        }));

      return NextResponse.json({ success: true, nodes, edges, query: q });
    }

    const raw = await getFullGraph();
    const data = raw[0] as { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] } | undefined;
    if (!data) {
      return NextResponse.json({ success: true, nodes: [], edges: [] });
    }

    const nodes: GraphNode[] = data.nodes
      .filter((n) => n.id)
      .map((n) => {
        const props = (n.properties || {}) as Record<string, unknown>;
        const node: GraphNode = {
          id: String(n.id),
          type: String(n.type) as NodeType,
          name: String(props.name || n.id),
          aliases: props.aliases as string[] | undefined,
          country: props.country as string | undefined,
          motivation: props.motivation as GraphNode['motivation'],
          mitre_id: props.mitre_id as string | undefined,
          cve_id: props.cve_id as string | undefined,
          cvss: props.cvss as number | undefined,
          severity: props.severity as GraphNode['severity'],
          exploited_in_wild: props.exploited_in_wild as boolean | undefined,
          affected_product: props.affected_product as string | undefined,
          lat: props.lat as number | undefined,
          lon: props.lon as number | undefined,
          malware_type: props.malware_type as string | undefined,
          uses_ai: props.uses_ai as boolean | undefined,
        };
        // Resolve missing geo coordinates from lookup
        if (node.lat == null && node.lon == null) {
          const geo = GEO_LOOKUP[node.name] || (node.country ? GEO_LOOKUP[node.country] : undefined);
          if (geo) { node.lat = geo.lat; node.lon = geo.lon; }
        }
        return node;
      });

    const edges: GraphEdge[] = data.edges
      .filter((e) => e.source && e.target && e.relationship)
      .map((e, i) => ({
        id: `edge-${i}`,
        source: String(e.source),
        target: String(e.target),
        relationship: String(e.relationship) as RelationshipType,
      }));

    return NextResponse.json({ success: true, nodes, edges });
  } catch (error) {
    console.error('[graph/query GET]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
