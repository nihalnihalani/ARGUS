import { NextRequest, NextResponse } from 'next/server';
import {
  listScouts,
  getScoutDetail,
  markScoutDone,
  deleteScout,
  updateScout,
} from '@/lib/yutori';

/** GET /api/scouts/manage — list all scouts or get detail for a single scout */
export async function GET(req: NextRequest) {
  try {
    const scoutId = req.nextUrl.searchParams.get('id');

    if (scoutId) {
      const detail = await getScoutDetail(scoutId);
      return NextResponse.json({ success: true, scout: detail });
    }

    const data = await listScouts();
    return NextResponse.json({ success: true, scouts: data.scouts });
  } catch (error) {
    console.error('[scouts/manage] GET', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/** PATCH /api/scouts/manage — update scout config (outputInterval, userTimezone) */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { scoutId, outputInterval, userTimezone } = body;

    if (!scoutId) {
      return NextResponse.json(
        { success: false, error: 'scoutId is required' },
        { status: 400 }
      );
    }

    const result = await updateScout(scoutId, { outputInterval, userTimezone });
    return NextResponse.json({ success: true, scout: result });
  } catch (error) {
    console.error('[scouts/manage] PATCH', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/** POST /api/scouts/manage — mark scout as done (stop it) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scoutId } = body;

    if (!scoutId) {
      return NextResponse.json(
        { success: false, error: 'scoutId is required' },
        { status: 400 }
      );
    }

    const result = await markScoutDone(scoutId);
    return NextResponse.json({ success: true, message: 'Scout marked as done', result });
  } catch (error) {
    console.error('[scouts/manage] POST', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/** DELETE /api/scouts/manage — permanently delete a scout */
export async function DELETE(req: NextRequest) {
  try {
    const scoutId = req.nextUrl.searchParams.get('id');

    if (!scoutId) {
      return NextResponse.json(
        { success: false, error: 'id query parameter is required' },
        { status: 400 }
      );
    }

    const result = await deleteScout(scoutId);
    return NextResponse.json({ success: true, message: 'Scout deleted', result });
  } catch (error) {
    console.error('[scouts/manage] DELETE', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
