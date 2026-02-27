import { NextRequest, NextResponse } from 'next/server';
import { research } from '@/lib/tavily';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'query is required' },
        { status: 400 }
      );
    }

    const results = await research(query);
    return NextResponse.json({ success: true, research: results });
  } catch (error) {
    console.error('[tavily/research]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
