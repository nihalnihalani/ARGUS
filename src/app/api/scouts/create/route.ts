import { NextRequest, NextResponse } from 'next/server';
import { createScout } from '@/lib/yutori';
import { threatIntelSchema } from '@/lib/schema';

const DEFAULT_SCOUT_QUERIES = [
  {
    query:
      'Monitor NVD and CISA advisories for new CVEs with CVSS >= 7.0, especially those with known exploits in the wild. Focus on critical infrastructure software: Ivanti, Fortinet, Cisco, VMware, Microsoft Exchange.',
    displayName: 'NVD/CISA CVE Monitor',
  },
  {
    query:
      'Monitor security researchers on Twitter/X including @MalwareHunterTeam, @GossiTheDog, @vaborosern, @GreyNoiseIO for breaking threat intelligence, new exploits, and active campaigns.',
    displayName: 'Security Twitter Monitor',
  },
  {
    query:
      'Monitor GitHub for new exploit proof-of-concept repositories, especially for recent CVEs affecting enterprise software. Track repos with rapid star growth related to security exploits.',
    displayName: 'GitHub Exploit PoC Monitor',
  },
  {
    query:
      'Monitor BleepingComputer, Hacker News, Krebs on Security, The Record, and Dark Reading for breaking cybersecurity news, ransomware campaigns, nation-state attacks, and zero-day disclosures.',
    displayName: 'Security News Monitor',
  },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const queries = body.queries || DEFAULT_SCOUT_QUERIES;
    const webhookUrl = body.webhookUrl as string | undefined;

    const scouts = await Promise.all(
      queries.map(
        (q: { query: string; displayName?: string }) =>
          createScout(
            q.query,
            q.displayName,
            { json_schema: threatIntelSchema },
            webhookUrl
          )
      )
    );

    return NextResponse.json({ success: true, scouts });
  } catch (error) {
    console.error('[scouts/create]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
