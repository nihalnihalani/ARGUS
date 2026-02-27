import { NextRequest, NextResponse } from 'next/server';
import { getTrajectory } from '@/lib/yutori';
import type { TrajectoryStep } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const taskId = req.nextUrl.searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'taskId query parameter is required' },
        { status: 400 }
      );
    }

    const data = await getTrajectory(taskId);
    const trajectory: TrajectoryStep[] = data.steps.map((step) => ({
      url: step.url,
      action: step.action,
      data_extracted: step.data_extracted,
      screenshot_url: step.screenshot_url,
      timestamp: step.timestamp,
    }));

    return NextResponse.json({ success: true, trajectory });
  } catch (error) {
    console.error('[browse/trajectory]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
