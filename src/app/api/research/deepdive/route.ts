import { NextRequest, NextResponse } from 'next/server';
import { createResearchTask, getResearchTask } from '@/lib/yutori';
import { threatIntelSchema } from '@/lib/schema';

const MAX_POLL_ATTEMPTS = 60;
const POLL_INTERVAL_MS = 3000;

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

    // Poll for completion
    let result = null;
    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      const status = await getResearchTask(task.id);
      if (status.status === 'completed') {
        result = status.result;
        break;
      }
      if (status.status === 'failed') {
        throw new Error('Research task failed');
      }
    }

    return NextResponse.json({
      success: true,
      research: {
        taskId: task.id,
        query: fullQuery,
        result,
        completed: result !== null,
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
