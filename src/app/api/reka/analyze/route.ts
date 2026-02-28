import { NextRequest, NextResponse } from "next/server";
import {
  analyzePhishingPage,
  analyzeForumScreenshot,
  analyzeMalwareUI,
  analyzeThreatScreenshot,
} from "@/lib/reka";
import type { VisualAnalysis } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl, analysisType, context } = body as {
      imageUrl?: string;
      analysisType?: "phishing" | "forum" | "malware" | "general";
      context?: string;
    };

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: "imageUrl is required" },
        { status: 400 }
      );
    }

    let analysis: VisualAnalysis;

    if (analysisType) {
      let result;
      switch (analysisType) {
        case "phishing":
          result = await analyzePhishingPage(imageUrl);
          break;
        case "forum":
          result = await analyzeForumScreenshot(imageUrl);
          break;
        case "malware":
          result = await analyzeMalwareUI(imageUrl);
          break;
        default:
          result = null;
      }

      if (result) {
        analysis = {
          imageUrl,
          analysisType,
          isPhishing: result.isPhishing,
          confidence: result.confidence,
          riskLevel: result.riskLevel as VisualAnalysis["riskLevel"],
          indicators: result.indicators,
          entitiesFound: result.entitiesFound,
          summary: result.summary,
          model: "reka-flash",
        };
      } else {
        // "general" or unknown type — fall through to auto-detect
        analysis = await analyzeThreatScreenshot(imageUrl, context);
      }
    } else {
      analysis = await analyzeThreatScreenshot(imageUrl, context);
    }

    return NextResponse.json({ success: true, analysis });
  } catch (error) {
    console.error("[reka/analyze]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
