import { NextRequest, NextResponse } from 'next/server';
import { runQuery, getFullGraph } from '@/lib/neo4j';
import type { GraphNode, GraphEdge, NodeType, RelationshipType } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cypher, params } = body;

    if (!cypher) {
      return NextResponse.json(
        { success: false, error: 'cypher query is required' },
        { status: 400 }
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
        return {
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
