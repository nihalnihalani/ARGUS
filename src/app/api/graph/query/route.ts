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
  // Organizations (by name)
  NATO: { lat: 50.85, lon: 4.36 },
  'US Department of Energy': { lat: 38.91, lon: -77.04 },
  Microsoft: { lat: 47.64, lon: -122.13 },
  SolarWinds: { lat: 30.27, lon: -97.74 },
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

export async function GET() {
  try {
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
