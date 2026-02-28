import { NextRequest, NextResponse } from "next/server";
import { extractStructuredThreatData, extractEntitiesGliner } from "@/lib/fastino";
import { extractEntities } from "@/lib/openai-client";
import type { ExtractionComparison } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = body as { text?: string };

    if (!text) {
      return NextResponse.json(
        { success: false, error: "text is required" },
        { status: 400 }
      );
    }

    // Run all extractions in parallel, timing each
    const glinerStart = performance.now();
    const glinerStructuredPromise = extractStructuredThreatData(text).then((result) => ({
      result,
      timeMs: performance.now() - glinerStart,
    }));

    const glinerRawPromise = extractEntitiesGliner(text);

    const openaiStart = performance.now();
    const openaiPromise = extractEntities(text).then((result) => ({
      result,
      timeMs: performance.now() - openaiStart,
    }));

    const [gliner, glinerRawEntities, openai] = await Promise.all([
      glinerStructuredPromise,
      glinerRawPromise,
      openaiPromise,
    ]);

    // Build name sets for overlap calculation (case-insensitive)
    const glinerNames = new Set(
      gliner.result.entities.map((e) => e.name.toLowerCase())
    );
    const openaiNames = new Set(
      openai.result.entities.map((e) => e.name.toLowerCase())
    );

    const sharedEntities: string[] = [];
    const glinerOnly: string[] = [];
    const openaiOnly: string[] = [];

    for (const name of glinerNames) {
      if (openaiNames.has(name)) {
        sharedEntities.push(name);
      } else {
        glinerOnly.push(name);
      }
    }
    for (const name of openaiNames) {
      if (!glinerNames.has(name)) {
        openaiOnly.push(name);
      }
    }

    const totalEntities = glinerNames.size + openaiNames.size;
    const f1Estimate =
      totalEntities > 0
        ? (2 * sharedEntities.length) / totalEntities
        : 0;

    const comparison: ExtractionComparison = {
      gliner: {
        entities: glinerRawEntities,
        entityCount: gliner.result.entities.length,
        iocCount: gliner.result.iocs.length,
        extractionTimeMs: Math.round(gliner.timeMs),
      },
      openai: {
        entities: openai.result.entities.map((e) => ({
          type: e.type,
          name: e.name,
        })),
        entityCount: openai.result.entities.length,
        iocCount: openai.result.iocs.length,
        extractionTimeMs: Math.round(openai.timeMs),
      },
      overlap: {
        sharedEntities,
        glinerOnly,
        openaiOnly,
        f1Estimate: Math.round(f1Estimate * 1000) / 1000,
      },
    };

    return NextResponse.json({ success: true, comparison });
  } catch (error) {
    console.error("[gliner/compare]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
