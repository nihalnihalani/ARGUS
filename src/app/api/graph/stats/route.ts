import { NextResponse } from 'next/server';
import { getGraphStats } from '@/lib/neo4j';
import type { GraphStats } from '@/lib/types';

export async function GET() {
  try {
    const results = await getGraphStats();

    if (results.length === 0) {
      const empty: GraphStats = {
        nodeCount: 0,
        edgeCount: 0,
        threatActorCount: 0,
        vulnerabilityCount: 0,
        criticalCount: 0,
        activeScouts: 0,
        lastUpdate: new Date().toISOString(),
      };
      return NextResponse.json({ success: true, stats: empty });
    }

    const raw = results[0] as Record<string, unknown>;

    // Neo4j integers may come as { low, high } objects — extract plain numbers
    const toNum = (v: unknown): number => {
      if (typeof v === 'number') return v;
      if (v && typeof v === 'object' && 'low' in v) return (v as { low: number }).low;
      return 0;
    };

    const stats: GraphStats = {
      nodeCount: toNum(raw.nodeCount),
      edgeCount: toNum(raw.edgeCount),
      threatActorCount: toNum(raw.actorCount),
      vulnerabilityCount: toNum(raw.vulnCount),
      criticalCount: toNum(raw.criticalCount),
      activeScouts: 0, // updated by dashboard
      lastUpdate: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('[graph/stats]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
