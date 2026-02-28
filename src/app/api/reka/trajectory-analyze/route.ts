import { NextRequest, NextResponse } from "next/server";
import { analyzeThreatScreenshot } from "@/lib/reka";
import type { TrajectoryStep, VisualAnalysis } from "@/lib/types";

interface StepAnalysis {
  stepIndex: number;
  url: string;
  action: string;
  analysis: VisualAnalysis;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskId } = body as { taskId?: string };

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: "taskId is required" },
        { status: 400 }
      );
    }

    // Fetch trajectory from the internal browse/trajectory API
    const trajectoryUrl = new URL(
      `/api/browse/trajectory?taskId=${encodeURIComponent(taskId)}`,
      req.url
    );
    const trajectoryRes = await fetch(trajectoryUrl.toString());

    if (!trajectoryRes.ok) {
      const text = await trajectoryRes.text();
      const status = trajectoryRes.status === 403 || trajectoryRes.status === 404 ? 404 : 502;
      return NextResponse.json(
        { success: false, error: `Failed to fetch trajectory (${trajectoryRes.status}): ${text}` },
        { status }
      );
    }

    const trajectoryData = (await trajectoryRes.json()) as {
      trajectory: TrajectoryStep[];
    };
    const steps = trajectoryData.trajectory;

    // Analyze all steps with screenshots in parallel
    const stepsWithScreenshots = steps
      .map((step, i) => ({ step, index: i }))
      .filter(({ step }) => !!step.screenshot_url);

    const analysisResults = await Promise.allSettled(
      stepsWithScreenshots.map(({ step }) =>
        analyzeThreatScreenshot(step.screenshot_url!)
      )
    );

    const stepAnalyses: StepAnalysis[] = [];
    let phishingDetected = 0;
    const allEntities: { type: string; name: string }[] = [];
    const allIndicators: string[] = [];
    const entitySet = new Set<string>();

    for (let j = 0; j < analysisResults.length; j++) {
      const result = analysisResults[j];
      if (result.status !== "fulfilled") continue;

      const { step, index } = stepsWithScreenshots[j];
      const analysis = result.value;

      stepAnalyses.push({
        stepIndex: index,
        url: step.url,
        action: step.action,
        analysis,
      });

      if (analysis.isPhishing) phishingDetected++;

      for (const entity of analysis.entitiesFound) {
        const key = `${entity.type}:${entity.name}`;
        if (!entitySet.has(key)) {
          entitySet.add(key);
          allEntities.push(entity);
        }
      }

      for (const indicator of analysis.indicators) {
        if (!allIndicators.includes(indicator)) {
          allIndicators.push(indicator);
        }
      }
    }

    return NextResponse.json({
      success: true,
      taskId,
      stepAnalyses,
      summary: {
        totalScreenshots: stepAnalyses.length,
        phishingDetected,
        entitiesFound: allEntities,
        indicators: allIndicators,
      },
    });
  } catch (error) {
    console.error("[reka/trajectory-analyze]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
