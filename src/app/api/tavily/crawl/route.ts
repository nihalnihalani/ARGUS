import { NextRequest, NextResponse } from 'next/server';
import { crawl } from '@/lib/tavily';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, options } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'url is required' },
        { status: 400 }
      );
    }

    // crawl() in tavily.ts already has map+extract fallback built in
    const results = await crawl(url, options);
    return NextResponse.json({ success: true, results: results.results });
  } catch (error) {
    console.error('[tavily/crawl]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
