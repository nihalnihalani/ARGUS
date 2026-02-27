import { NextRequest, NextResponse } from 'next/server';
import { pollScout } from '@/lib/yutori';
import type { FeedItem, NodeType } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const scoutIds = req.nextUrl.searchParams.get('scoutIds');
    const pageSize = parseInt(req.nextUrl.searchParams.get('pageSize') || '5', 10);

    // Support both single id and comma-separated ids
    const singleId = req.nextUrl.searchParams.get('id');
    const ids = scoutIds
      ? scoutIds.split(',').map((s) => s.trim())
      : singleId
        ? [singleId]
        : [];

    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Provide scoutIds or id query parameter' },
        { status: 400 }
      );
    }

    const allUpdates: {
      scoutId: string;
      updates: { id: string; content: string; created_at: string }[];
    }[] = [];

    for (const id of ids) {
      try {
        const data = await pollScout(id, pageSize);
        allUpdates.push({ scoutId: id, updates: data.updates });
      } catch (err) {
        console.warn(`[scouts/poll] Failed to poll scout ${id}:`, err);
        allUpdates.push({ scoutId: id, updates: [] });
      }
    }

    // Parse structured JSON from each update content
    const feedItems: FeedItem[] = [];
    const entities: { type: NodeType; name: string }[] = [];

    for (const scout of allUpdates) {
      for (const update of scout.updates) {
        try {
          const parsed = JSON.parse(update.content);
          if (parsed.entities) {
            for (const entity of parsed.entities) {
              entities.push({ type: entity.type, name: entity.name });
            }
          }
          if (parsed.threat_brief) {
            feedItems.push({
              id: update.id,
              timestamp: update.created_at,
              severity: parsed.threat_brief.severity || 'info',
              source: 'system',
              title: parsed.threat_brief.headline || 'Scout update',
              description: parsed.threat_brief.summary || update.content.slice(0, 200),
              entities: parsed.entities?.map((e: { type: NodeType; name: string }) => ({
                type: e.type,
                name: e.name,
              })),
            });
          }
        } catch {
          // Content wasn't structured JSON — include as raw feed item
          feedItems.push({
            id: update.id,
            timestamp: update.created_at,
            severity: 'info',
            source: 'system',
            title: 'Scout update',
            description: update.content.slice(0, 300),
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      updates: allUpdates,
      feedItems,
      entities,
      scoutsPolled: ids.length,
    });
  } catch (error) {
    console.error('[scouts/poll]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
