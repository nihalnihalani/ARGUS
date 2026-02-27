import { NextRequest, NextResponse } from 'next/server';
import { findAttackPaths } from '@/lib/neo4j';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { actorName, orgName } = body;

    if (!actorName || !orgName) {
      return NextResponse.json(
        { success: false, error: 'actorName and orgName are required' },
        { status: 400 }
      );
    }

    const results = await findAttackPaths(actorName, orgName);

    if (results.length === 0) {
      return NextResponse.json({
        success: true,
        path: null,
        message: `No attack path found from ${actorName} to ${orgName}`,
      });
    }

    const pathData = results[0] as { nodes: { id: string; type: string; name: string }[]; edges: { type: string; source: string; target: string }[] };
    return NextResponse.json({
      success: true,
      path: {
        nodes: pathData.nodes.map((n) => ({
          ...n,
          isAttackPath: true,
        })),
        edges: pathData.edges.map((e) => ({
          ...e,
          relationship: e.type,
          isAttackPath: true,
        })),
      },
    });
  } catch (error) {
    console.error('[graph/path]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
