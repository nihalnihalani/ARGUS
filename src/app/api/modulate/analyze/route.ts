import { NextRequest, NextResponse } from "next/server";
import {
  analyzeVoice,
  detectDeepfake,
  getIntegrationStatus,
} from "@/lib/modulate";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audioUrl, analysisType } = body as {
      audioUrl?: string;
      analysisType?: "full" | "deepfake" | "status";
    };

    // Status check — return integration info.
    if (analysisType === "status") {
      const status = getIntegrationStatus();
      return NextResponse.json({
        success: true,
        analysis: status,
        note: "This is a stub integration — Modulate API access pending",
      });
    }

    if (!audioUrl) {
      return NextResponse.json(
        { success: false, error: "audioUrl is required" },
        { status: 400 }
      );
    }

    // Deepfake-only analysis.
    if (analysisType === "deepfake") {
      const result = await detectDeepfake(audioUrl);
      return NextResponse.json({
        success: true,
        analysis: result,
        note: "This is a stub integration — Modulate API access pending",
      });
    }

    // Full voice analysis (default).
    const result = await analyzeVoice(audioUrl);
    return NextResponse.json({
      success: true,
      analysis: result,
      note: "This is a stub integration — Modulate API access pending",
    });
  } catch (error) {
    console.error("[modulate/analyze]", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
