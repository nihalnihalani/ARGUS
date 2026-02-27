import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // Validate basic webhook structure
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ received: false, error: 'Invalid payload' }, { status: 400 });
    }

    const { task_id, update } = payload;
    console.log(`[scouts/webhook] Received webhook for task ${task_id}`);

    // Forward to the pipeline ingest endpoint for processing
    if (update?.content) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      await fetch(`${baseUrl}/api/pipeline/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scoutUpdate: update.content }),
      }).catch((err) => {
        console.warn('[scouts/webhook] Pipeline ingest failed:', err);
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[scouts/webhook]', error);
    return NextResponse.json(
      { received: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
