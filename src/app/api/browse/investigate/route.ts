import { NextRequest, NextResponse } from 'next/server';
import { createBrowsingTask, getBrowsingTask } from '@/lib/yutori';

const INVESTIGATION_URLS: Record<string, (target: string) => string> = {
  whois: (target) => `https://who.is/whois/${encodeURIComponent(target)}`,
  dns: (target) => `https://who.is/dns/${encodeURIComponent(target)}`,
  ip: (target) => `https://who.is/whois-ip/ip-address/${encodeURIComponent(target)}`,
};

const MAX_POLL_ATTEMPTS = 30;
const POLL_INTERVAL_MS = 2000;

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

    // Poll for completion
    let result = null;
    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      const status = await getBrowsingTask(browsingTask.id);
      if (status.status === 'completed') {
        result = status.result;
        break;
      }
      if (status.status === 'failed') {
        throw new Error('Browsing task failed');
      }
    }

    return NextResponse.json({
      success: true,
      investigation: {
        taskId: browsingTask.id,
        target,
        type,
        startUrl,
        result,
        completed: result !== null,
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
