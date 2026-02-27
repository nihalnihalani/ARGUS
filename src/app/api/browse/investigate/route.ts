import { NextRequest, NextResponse } from 'next/server';
import { createBrowsingTask, getBrowsingTask } from '@/lib/yutori';

const INVESTIGATION_URLS: Record<string, (target: string) => string> = {
  whois: (target) => `https://who.is/whois/${encodeURIComponent(target)}`,
  dns: (target) => `https://who.is/dns/${encodeURIComponent(target)}`,
  ip: (target) => `https://who.is/whois-ip/ip-address/${encodeURIComponent(target)}`,
};

/** POST — Create a browsing investigation task (returns immediately with task ID) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { target, type = 'whois' } = body;

    if (!target) {
      return NextResponse.json(
        { success: false, error: 'target is required' },
        { status: 400 }
      );
    }

    const urlBuilder = INVESTIGATION_URLS[type];
    if (!urlBuilder) {
      return NextResponse.json(
        { success: false, error: `Invalid type: ${type}. Use whois, dns, or ip` },
        { status: 400 }
      );
    }

    const startUrl = urlBuilder(target);
    const task = `Investigate ${target} using ${type} lookup. Extract all registration details, DNS records, IP geolocation, hosting provider, and any relevant security information. Look for signs of malicious infrastructure.`;

    const browsingTask = await createBrowsingTask(startUrl, task);

    return NextResponse.json({
      success: true,
      investigation: {
        taskId: browsingTask.id,
        target,
        type,
        startUrl,
        status: browsingTask.status,
      },
    });
  } catch (error) {
    console.error('[browse/investigate]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/** GET — Poll browsing task status */
export async function GET(req: NextRequest) {
  try {
    const taskId = req.nextUrl.searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'taskId query parameter is required' },
        { status: 400 }
      );
    }

    const status = await getBrowsingTask(taskId);

    return NextResponse.json({
      success: true,
      investigation: {
        taskId,
        status: status.status,
        result: status.result ?? null,
        completed: status.status === 'completed' || status.status === 'succeeded',
        failed: status.status === 'failed',
      },
    });
  } catch (error) {
    console.error('[browse/investigate] GET', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
