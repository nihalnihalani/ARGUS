import { NextRequest, NextResponse } from 'next/server';
import { updateScoutEmailSettings } from '@/lib/yutori';

/** PUT /api/scouts/email-settings — update email notification settings for a scout */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { scoutId, skipEmail, subscribersToAdd, subscribersToRemove } = body;

    if (!scoutId) {
      return NextResponse.json(
        { success: false, error: 'scoutId is required' },
        { status: 400 }
      );
    }

    if (
      skipEmail == null &&
      !subscribersToAdd?.length &&
      !subscribersToRemove?.length
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'At least one of skipEmail, subscribersToAdd, or subscribersToRemove is required',
        },
        { status: 400 }
      );
    }

    const result = await updateScoutEmailSettings(scoutId, {
      skipEmail,
      subscribersToAdd,
      subscribersToRemove,
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('[scouts/email-settings]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
