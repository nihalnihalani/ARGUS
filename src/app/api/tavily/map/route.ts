import { NextRequest, NextResponse } from 'next/server';
import { map } from '@/lib/tavily';

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

    const results = await map(url, options);
    return NextResponse.json({ success: true, urls: results.urls });
  } catch (error) {
    console.error('[tavily/map]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
