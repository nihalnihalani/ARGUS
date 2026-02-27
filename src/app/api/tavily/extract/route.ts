import { NextRequest, NextResponse } from 'next/server';
import { extract } from '@/lib/tavily';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { urls } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'urls array is required (up to 20)' },
        { status: 400 }
      );
    }

    const results = await extract(urls.slice(0, 20));
    return NextResponse.json({
      success: true,
      extractions: results.results,
      failed: results.failed_results,
    });
  } catch (error) {
    console.error('[tavily/extract]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
