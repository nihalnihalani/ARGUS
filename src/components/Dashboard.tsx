"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Header from "@/components/Header";
import LiveFeed from "@/components/LiveFeed";
import ThreatBrief from "@/components/ThreatBrief";
import SearchBar from "@/components/SearchBar";
import TrajectoryViewer from "@/components/TrajectoryViewer";
import type {
  GraphNode,
  GraphEdge,
  FeedItem,
  ThreatBrief as ThreatBriefType,
  GraphStats,
  PipelineResult,
} from "@/lib/types";

const DEMO_FEED_ITEMS: FeedItem[] = [
  {
    id: "feed-1",
    timestamp: new Date(Date.now() - 30000).toISOString(),
    severity: "critical",
    source: "nvd",
    title: "CVE-2026-1731: BeyondTrust PRA Remote Code Execution",
    description:
      "Critical command injection vulnerability in BeyondTrust Privileged Remote Access (CVSS 9.8). Active exploitation by APT28 confirmed. Immediate patching required.",
    entities: [
      { type: "Vulnerability", name: "CVE-2026-1731" },
      { type: "ThreatActor", name: "APT28" },
    ],
  },
  {
    id: "feed-2",
    timestamp: new Date(Date.now() - 120000).toISOString(),
    severity: "critical",
    source: "news",
    title: "Volt Typhoon Targets US Critical Infrastructure via Ivanti Zero-Day",
    description:
      "Chinese state-sponsored group Volt Typhoon exploiting CVE-2026-21510 in Ivanti EPMM to target energy sector organizations in the western United States.",
    entities: [
      { type: "ThreatActor", name: "Volt Typhoon" },
      { type: "Vulnerability", name: "CVE-2026-21510" },
    ],
  },
  {
    id: "feed-3",
    timestamp: new Date(Date.now() - 300000).toISOString(),
    severity: "high",
    source: "github",
    title: "PoC Exploit Published for SmarterMail CVE-2026-23760",
    description:
      "Public proof-of-concept exploit code released on GitHub for SmarterMail deserialization vulnerability. Warlock group observed adapting exploit for ransomware campaigns.",
    entities: [
      { type: "Vulnerability", name: "CVE-2026-23760" },
      { type: "ThreatActor", name: "Warlock" },
    ],
  },
  {
    id: "feed-4",
    timestamp: new Date(Date.now() - 600000).toISOString(),
    severity: "high",
    source: "twitter",
    title: "PromptSpy Malware Using AI to Exfiltrate LLM Conversations",
    description:
      "New Android malware 'PromptSpy' leverages on-device ML to identify and exfiltrate sensitive prompts from AI assistant apps. Already detected in 15,000+ devices.",
    entities: [
      { type: "Malware", name: "PromptSpy" },
      { type: "Software", name: "Android" },
    ],
  },
  {
    id: "feed-5",
    timestamp: new Date(Date.now() - 900000).toISOString(),
    severity: "medium",
    source: "nvd",
    title: "CVE-2026-22769: Apache Tomcat Request Smuggling",
    description:
      "HTTP request smuggling vulnerability in Apache Tomcat (CVSS 7.5). Affects versions 10.x and 11.x. Patch available.",
    entities: [
      { type: "Vulnerability", name: "CVE-2026-22769" },
      { type: "Software", name: "Apache Tomcat" },
    ],
  },
  {
    id: "feed-6",
    timestamp: new Date(Date.now() - 1200000).toISOString(),
    severity: "critical",
    source: "news",
    title: "Lazarus Group Linked to $1.5B Bybit Cryptocurrency Heist",
    description:
      "FBI confirms North Korean Lazarus Group responsible for the Bybit exchange breach. Funds laundered through Tornado Cash and cross-chain bridges.",
    entities: [
      { type: "ThreatActor", name: "Lazarus Group" },
      { type: "Campaign", name: "Bybit Heist" },
    ],
  },
  {
    id: "feed-7",
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    severity: "info",
    source: "system",
    title: "Scout #1 (NVD Monitor) initialized successfully",
    description:
      "Autonomous scout deployed to monitor NVD/CISA feeds for high-severity CVEs. Polling interval: 30 seconds.",
  },
  {
    id: "feed-8",
    timestamp: new Date(Date.now() - 2400000).toISOString(),
    severity: "high",
    source: "nvd",
    title: "CVE-2026-29824: Windows CLFS Zero-Day Under Active Exploitation",
    description:
      "Microsoft CLFS elevation of privilege vulnerability being exploited by ransomware operators. CVSS 7.8. Patch Tuesday fix pending.",
    entities: [
      { type: "Vulnerability", name: "CVE-2026-29824" },
      { type: "Software", name: "Windows 11" },
    ],
  },
];

const DEMO_BRIEF: ThreatBriefType = {
  overall_threat_level: "critical",
  headline:
    "Critical Infrastructure Under Active Multi-Vector Attack — CISA Monitoring Gaps Exploited",
  executive_summary:
    "The current threat landscape is at **critical** severity. With CISA workforce reductions severely impacting proactive threat scanning, multiple nation-state actors are actively exploiting the monitoring gap. **Volt Typhoon** continues targeting US energy infrastructure through Ivanti zero-days, **APT28** has pivoted to BeyondTrust exploits targeting financial institutions, and the **Lazarus Group** completed a record $1.5B cryptocurrency heist. A new AI-powered malware family (**PromptSpy**) represents an emerging class of threats that weaponize on-device ML capabilities.",
  top_threats: [
    {
      threat: "Volt Typhoon Critical Infrastructure Campaign",
      severity: 9.5,
      affected_sectors: ["Energy", "Water", "Government"],
      recommended_action:
        "Immediately patch Ivanti EPMM CVE-2026-21510 and audit all VPN concentrators for IOCs.",
    },
    {
      threat: "APT28 BeyondTrust Exploitation",
      severity: 9.2,
      affected_sectors: ["Finance", "Healthcare"],
      recommended_action:
        "Upgrade BeyondTrust PRA/RS to latest version. Monitor for lateral movement via stolen credentials.",
    },
    {
      threat: "Warlock Ransomware Campaign",
      severity: 8.7,
      affected_sectors: ["Government", "Technology"],
      recommended_action:
        "Block SmarterMail exploitation attempts. Ensure offline backups are current.",
    },
    {
      threat: "PromptSpy AI Malware",
      severity: 7.8,
      affected_sectors: ["Technology", "All Sectors"],
      recommended_action:
        "Audit mobile device management policies. Block known C2 domains associated with PromptSpy.",
    },
  ],
  attack_paths_detected: [
    {
      from_actor: "APT28",
      through_vulnerability: "CVE-2026-1731",
      to_target: "Pacific Financial Group",
      risk_score: 9.2,
    },
    {
      from_actor: "Volt Typhoon",
      through_vulnerability: "CVE-2026-21510",
      to_target: "Western Grid Authority",
      risk_score: 9.5,
    },
    {
      from_actor: "Warlock",
      through_vulnerability: "CVE-2026-23760",
      to_target: "FedTech Solutions",
      risk_score: 8.7,
    },
  ],
  cisa_relevant:
    "With CISA workforce reduced by over 50%, automated threat monitoring is essential. Multiple CISA KEV catalog entries remain unpatched across federal agencies. This platform provides continuous coverage where human monitoring has been disrupted.",
  recommended_actions: [
    "Patch all CVEs with CVSS >= 9.0 within 24 hours (CVE-2026-1731, CVE-2026-21510)",
    "Deploy network segmentation for critical OT/ICS systems exposed to Volt Typhoon",
    "Rotate all BeyondTrust credentials and enable MFA on privileged access tools",
    "Implement mobile threat defense to detect PromptSpy and similar AI malware",
    "Enable enhanced logging on SmarterMail servers and monitor for deserialization attempts",
    "Review and update incident response playbooks for ransomware scenarios",
  ],
};

const DEFAULT_STATS: GraphStats = {
  nodeCount: 0,
  edgeCount: 0,
  threatActorCount: 0,
  vulnerabilityCount: 0,
  criticalCount: 0,
  activeScouts: 0,
  lastUpdate: "",
};

export default function Dashboard() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>(DEMO_FEED_ITEMS);
  const [threatBrief, setThreatBrief] = useState<ThreatBriefType | null>(
    DEMO_BRIEF
  );
  const [stats, setStats] = useState<GraphStats>(DEFAULT_STATS);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBriefLoading, setIsBriefLoading] = useState(false);
  const [trajectoryTaskId, setTrajectoryTaskId] = useState<string | null>(null);
  const [trajectoryOpen, setTrajectoryOpen] = useState(false);
  const [activeScoutIds, setActiveScoutIds] = useState<string[]>([]);

  // Fetch initial graph data
  useEffect(() => {
    async function loadGraph() {
      try {
        const [graphRes, statsRes] = await Promise.all([
          fetch("/api/graph/query"),
          fetch("/api/graph/stats"),
        ]);

        if (graphRes.ok) {
          const graphData = await graphRes.json();
          if (graphData.nodes?.length > 0) {
            setNodes(graphData.nodes);
            setEdges(graphData.edges || []);
          }
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats({
            nodeCount: statsData.nodeCount || nodes.length,
            edgeCount: statsData.edgeCount || edges.length,
            threatActorCount: statsData.actorCount || 0,
            vulnerabilityCount: statsData.vulnCount || 0,
            criticalCount: statsData.criticalCount || 0,
            activeScouts: activeScoutIds.length,
            lastUpdate: new Date().toLocaleTimeString(),
          });
        }
      } catch {
        // Silent fail — use demo data
        setStats({
          nodeCount: 123,
          edgeCount: 347,
          threatActorCount: 15,
          vulnerabilityCount: 30,
          criticalCount: 8,
          activeScouts: 4,
          lastUpdate: new Date().toLocaleTimeString(),
        });
      }
    }

    loadGraph();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll scouts every 30 seconds
  useEffect(() => {
    if (activeScoutIds.length === 0) return;

    const interval = setInterval(async () => {
      for (const scoutId of activeScoutIds) {
        try {
          const res = await fetch(`/api/scouts/poll?id=${scoutId}`);
          const data = await res.json();
          if (data.updates?.length > 0) {
            for (const update of data.updates) {
              const pipelineRes = await fetch("/api/pipeline/ingest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ scoutUpdate: update.content }),
              });

              if (pipelineRes.ok) {
                const result: PipelineResult = await pipelineRes.json();
                setNodes((prev) => [...prev, ...result.newNodes]);
                setEdges((prev) => [...prev, ...result.newEdges]);
                setFeedItems((prev) =>
                  [...result.feedItems, ...prev].slice(0, 50)
                );
                setThreatBrief(result.threatBrief);
                if (result.feedItems[0]) {
                  toast.error(`New threat intel: ${result.feedItems[0].title}`);
                }
              }
            }
          }
        } catch {
          // Silent fail on poll — next cycle will retry
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [activeScoutIds]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [graphRes, statsRes] = await Promise.all([
        fetch("/api/graph/query"),
        fetch("/api/graph/stats"),
      ]);

      if (graphRes.ok) {
        const graphData = await graphRes.json();
        if (graphData.nodes?.length > 0) {
          setNodes(graphData.nodes);
          setEdges(graphData.edges || []);
        }
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats((prev) => ({
          ...prev,
          nodeCount: statsData.nodeCount || prev.nodeCount,
          edgeCount: statsData.edgeCount || prev.edgeCount,
          threatActorCount: statsData.actorCount || prev.threatActorCount,
          vulnerabilityCount: statsData.vulnCount || prev.vulnerabilityCount,
          criticalCount: statsData.criticalCount || prev.criticalCount,
          lastUpdate: new Date().toLocaleTimeString(),
        }));
      }

      toast.success("Data refreshed");
    } catch {
      toast.error("Refresh failed — using cached data");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleSearchResults = useCallback(
    (newNodes: GraphNode[], newEdges: GraphEdge[]) => {
      if (newNodes.length > 0) {
        setNodes((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const unique = newNodes
            .filter((n) => !existingIds.has(n.id))
            .map((n) => ({ ...n, isNew: true }));
          return [...prev, ...unique];
        });
      }
      if (newEdges.length > 0) {
        setEdges((prev) => {
          const existingIds = new Set(prev.map((e) => e.id));
          const unique = newEdges.filter((e) => !existingIds.has(e.id));
          return [...prev, ...unique];
        });
      }
    },
    []
  );

  const handleViewTrajectory = useCallback((taskId: string) => {
    setTrajectoryTaskId(taskId);
    setTrajectoryOpen(true);
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#030712] flex flex-col">
      {/* Header */}
      <Header
        stats={stats}
        threatLevel={threatBrief?.overall_threat_level || "moderate"}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-[55%_45%] grid-rows-[55%_45%] gap-px bg-gray-800/30 overflow-hidden">
        {/* Top Left: ThreatGraph (D3.js placeholder) */}
        <div className="bg-[#030712] relative overflow-hidden">
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-700">
            <svg
              viewBox="0 0 200 200"
              className="w-32 h-32 opacity-20"
            >
              {/* Placeholder graph viz */}
              <circle cx="100" cy="60" r="8" fill="#ef4444" opacity="0.6" />
              <circle cx="60" cy="120" r="6" fill="#3b82f6" opacity="0.6" />
              <circle cx="140" cy="120" r="6" fill="#22c55e" opacity="0.6" />
              <circle cx="40" cy="80" r="5" fill="#a855f7" opacity="0.6" />
              <circle cx="160" cy="80" r="5" fill="#f97316" opacity="0.6" />
              <circle cx="100" cy="160" r="4" fill="#eab308" opacity="0.6" />
              <line
                x1="100" y1="60" x2="60" y2="120"
                stroke="#374151" strokeWidth="1"
              />
              <line
                x1="100" y1="60" x2="140" y2="120"
                stroke="#374151" strokeWidth="1"
              />
              <line
                x1="100" y1="60" x2="40" y2="80"
                stroke="#374151" strokeWidth="1"
              />
              <line
                x1="100" y1="60" x2="160" y2="80"
                stroke="#374151" strokeWidth="1"
              />
              <line
                x1="60" y1="120" x2="100" y2="160"
                stroke="#374151" strokeWidth="1"
              />
              <line
                x1="140" y1="120" x2="100" y2="160"
                stroke="#374151" strokeWidth="1"
              />
            </svg>
            <span className="text-sm mt-4 font-mono text-gray-600">
              ThreatGraph — D3.js Force Graph
            </span>
            <span className="text-xs text-gray-700 mt-1">
              {nodes.length > 0
                ? `${nodes.length} nodes loaded`
                : "Awaiting graph data..."}
            </span>
          </div>
        </div>

        {/* Top Right: AttackMap (deck.gl placeholder) */}
        <div className="bg-[#030712] relative overflow-hidden">
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-700">
            <svg
              viewBox="0 0 200 120"
              className="w-40 h-24 opacity-20"
            >
              {/* Simple world map outline placeholder */}
              <ellipse
                cx="100" cy="60" rx="90" ry="50"
                fill="none" stroke="#374151" strokeWidth="1"
              />
              <ellipse
                cx="100" cy="60" rx="45" ry="50"
                fill="none" stroke="#374151" strokeWidth="0.5"
              />
              <line
                x1="10" y1="60" x2="190" y2="60"
                stroke="#374151" strokeWidth="0.5"
              />
              {/* Attack arcs */}
              <path
                d="M 50 45 Q 100 10 150 55"
                fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.5"
              />
              <path
                d="M 30 65 Q 80 30 140 50"
                fill="none" stroke="#f97316" strokeWidth="1" opacity="0.4"
              />
              <circle cx="50" cy="45" r="3" fill="#ef4444" opacity="0.6" />
              <circle cx="150" cy="55" r="3" fill="#22c55e" opacity="0.6" />
            </svg>
            <span className="text-sm mt-4 font-mono text-gray-600">
              AttackMap — deck.gl + MapLibre
            </span>
            <span className="text-xs text-gray-700 mt-1">
              Global threat visualization
            </span>
          </div>
        </div>

        {/* Bottom Left: LiveFeed */}
        <div className="bg-[#030712] overflow-hidden col-span-1" style={{ gridColumn: "1 / 2" }}>
          <div className="h-full grid grid-cols-[40%_60%] gap-px bg-gray-800/30">
            <div className="bg-[#030712] overflow-hidden">
              <LiveFeed items={feedItems} />
            </div>
            <div className="bg-[#030712] overflow-hidden">
              <ThreatBrief brief={threatBrief} isLoading={isBriefLoading} />
            </div>
          </div>
        </div>

        {/* Bottom Right: Search + Investigate */}
        <div className="bg-[#030712] overflow-hidden">
          <SearchBar
            onResults={handleSearchResults}
            onViewTrajectory={handleViewTrajectory}
          />
        </div>
      </div>

      {/* Trajectory Modal */}
      <TrajectoryViewer
        open={trajectoryOpen}
        onOpenChange={setTrajectoryOpen}
        taskId={trajectoryTaskId}
      />
    </div>
  );
}
