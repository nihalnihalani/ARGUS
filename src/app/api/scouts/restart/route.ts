import { NextRequest, NextResponse } from 'next/server';
import { restartScout } from '@/lib/yutori';

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { scoutId, newQuery } = body;

    if (!scoutId || !newQuery) {
      return NextResponse.json(
        { success: false, error: 'scoutId and newQuery are required' },
        { status: 400 }
      );
    }

    const result = await restartScout(scoutId, newQuery);
    return NextResponse.json({ success: true, message: 'Scout restarted', scout: result });
  } catch (error) {
    console.error('[scouts/restart]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
