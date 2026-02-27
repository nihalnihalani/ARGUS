import { NextRequest, NextResponse } from 'next/server';
import { search } from '@/lib/tavily';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, options } = body;

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'query is required' },
        { status: 400 }
      );
    }

    const results = await search(query, options);
    return NextResponse.json({ success: true, results: results.results });
  } catch (error) {
    console.error('[tavily/search]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
