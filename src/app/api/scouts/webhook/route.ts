import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // Validate webhook source headers
    const userAgent = req.headers.get('user-agent');
    const scoutEvent = req.headers.get('x-scout-event');
    if (userAgent !== 'Scout-Webhook/1.0' || scoutEvent !== 'scout.update') {
      return NextResponse.json({ received: false, error: 'Invalid webhook source' }, { status: 403 });
    }

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
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.PIPELINE_SECRET
            ? { 'x-pipeline-secret': process.env.PIPELINE_SECRET }
            : {}),
        },
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
