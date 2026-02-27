import { NextRequest, NextResponse } from 'next/server';
import { extractEntities, generateThreatBrief, classifyThreat } from '@/lib/openai-client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rawText, graphContext, newFindings, analysisType = 'extract' } = body;

    switch (analysisType) {
      case 'extract': {
        if (!rawText) {
          return NextResponse.json(
            { success: false, error: 'rawText is required for extract analysis' },
            { status: 400 }
          );
        }
        const entities = await extractEntities(rawText);
        return NextResponse.json({ success: true, analysisType: 'extract', data: entities });
      }
      case 'brief': {
        if (!graphContext || !newFindings) {
          return NextResponse.json(
            { success: false, error: 'graphContext and newFindings are required for brief analysis' },
            { status: 400 }
          );
        }
        const brief = await generateThreatBrief(graphContext, newFindings);
        return NextResponse.json({ success: true, analysisType: 'brief', data: brief });
      }
      case 'classify': {
        if (!rawText) {
          return NextResponse.json(
            { success: false, error: 'rawText is required for classify analysis' },
            { status: 400 }
          );
        }
        const classification = await classifyThreat(rawText);
        return NextResponse.json({ success: true, analysisType: 'classify', data: classification });
      }
      default:
        return NextResponse.json(
          { success: false, error: `Unknown analysisType: ${analysisType}. Use extract, brief, or classify` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[analyze]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
