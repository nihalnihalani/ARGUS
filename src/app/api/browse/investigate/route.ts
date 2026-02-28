import { NextRequest, NextResponse } from 'next/server';
import { createBrowsingTask, getBrowsingTask } from '@/lib/yutori';

const investigationSchema = {
  type: "object" as const,
  properties: {
    target: { type: "string" as const, description: "The domain, IP, or entity investigated" },
    registrant: {
      type: "object" as const,
      properties: {
        name: { type: "string" as const },
        organization: { type: "string" as const },
        email: { type: "string" as const },
        country: { type: "string" as const },
      },
    },
    dns_records: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          type: { type: "string" as const, description: "A, AAAA, MX, NS, TXT, CNAME, etc." },
          value: { type: "string" as const },
        },
        required: ["type", "value"] as const,
      },
    },
    hosting: {
      type: "object" as const,
      properties: {
        provider: { type: "string" as const },
        ip_address: { type: "string" as const },
        asn: { type: "string" as const },
        location: { type: "string" as const },
      },
    },
    security_flags: {
      type: "array" as const,
      items: { type: "string" as const },
      description: "Signs of malicious infrastructure, phishing, or suspicious configuration",
    },
    raw_summary: { type: "string" as const, description: "Free-text summary of all findings" },
  },
  required: ["target", "raw_summary"] as const,
};

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

    const browsingTask = await createBrowsingTask(startUrl, task, investigationSchema);

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
