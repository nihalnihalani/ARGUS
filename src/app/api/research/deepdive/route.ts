import { NextRequest, NextResponse } from 'next/server';
import { createResearchTask, getResearchTask } from '@/lib/yutori';
import { threatIntelSchema } from '@/lib/schema';

/** POST — Create a research task (returns immediately with task ID) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, context } = body;

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'query is required' },
        { status: 400 }
      );
    }

    const fullQuery = context
      ? `${query}\n\nAdditional context: ${context}`
      : query;

    const task = await createResearchTask(fullQuery, threatIntelSchema);

    // Yutori may return `id` or `taskId` depending on API version
    const raw = task as Record<string, unknown>;
    const taskId = raw.id ?? raw.taskId ?? raw.task_id;

    if (!taskId) {
      console.error('[research/deepdive] Unexpected response shape:', JSON.stringify(raw));
      return NextResponse.json(
        { success: false, error: 'Yutori API returned no task ID', raw },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      research: {
        taskId: String(taskId),
        query: fullQuery,
        status: raw.status ?? 'unknown',
      },
    });
  } catch (error) {
    console.error('[research/deepdive]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/** GET — Poll research task status */
export async function GET(req: NextRequest) {
  try {
    const taskId = req.nextUrl.searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'taskId query parameter is required' },
        { status: 400 }
      );
    }

    const status = await getResearchTask(taskId);

    return NextResponse.json({
      success: true,
      research: {
        taskId,
        status: status.status,
        result: status.result ?? null,
        completed: status.status === 'completed' || status.status === 'succeeded',
        failed: status.status === 'failed',
      },
    });
  } catch (error) {
    console.error('[research/deepdive] GET', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
