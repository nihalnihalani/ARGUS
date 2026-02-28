import { NextRequest, NextResponse } from "next/server";
import {
  extractStructuredThreatData,
  extractEntitiesGliner,
} from "@/lib/fastino";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, labels } = body as { text?: string; labels?: string[] };

    if (!text) {
      return NextResponse.json(
        { success: false, error: "text is required" },
        { status: 400 }
      );
    }

    // If custom labels are provided, run entity extraction only
    if (labels && labels.length > 0) {
      const entities = await extractEntitiesGliner(text, labels);
      return NextResponse.json({
        success: true,
        entities,
        relations: [],
        iocs: [],
        classifications: [],
      });
    }

    // Otherwise run full structured extraction
    const result = await extractStructuredThreatData(text);
    return NextResponse.json({
      success: true,
      entities: result.entities,
      relations: result.relationships,
      iocs: result.iocs,
      classifications: result.classifications,
    });
  } catch (error) {
    console.error("[gliner/extract]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
