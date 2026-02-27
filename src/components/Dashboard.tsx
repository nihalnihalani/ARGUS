"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  CircuitBoard,
  GitBranch,
  Skull,
  Bug,
  AlertTriangle,
  Radio,
  Globe,
  Zap,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import ThreatGraph from "@/components/ThreatGraph";
import AttackMap from "@/components/AttackMap";
import LiveFeed from "@/components/LiveFeed";
import ThreatBrief from "@/components/ThreatBrief";
import SearchBar from "@/components/SearchBar";
import TrajectoryViewer from "@/components/TrajectoryViewer";
import { BentoItem } from "@/components/ui/holographic-interface";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";
import type {
  GraphNode,
  GraphEdge,
  FeedItem,
  ThreatBrief as ThreatBriefType,
  GraphStats,
  AttackArc,
  PipelineResult,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Demo / pre-cached data
// ---------------------------------------------------------------------------

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

const DEMO_ARCS: AttackArc[] = [
  {
    id: "arc-apt28-pacific",
    actorName: "APT28",
    campaignName: "BeyondTrust Exploitation",
    sourceLat: 55.75,
    sourceLon: 37.62,
    targetLat: 37.77,
    targetLon: -122.42,
    targetOrg: "Pacific Financial Group",
    severity: "critical",
    cves: ["CVE-2026-1731"],
  },
  {
    id: "arc-volt-western",
    actorName: "Volt Typhoon",
    campaignName: "Volt Typhoon 2026",
    sourceLat: 39.9,
    sourceLon: 116.4,
    targetLat: 34.05,
    targetLon: -118.24,
    targetOrg: "Western Grid Authority",
    severity: "critical",
    cves: ["CVE-2026-21510"],
  },
  {
    id: "arc-warlock-fedtech",
    actorName: "Warlock",
    sourceLat: 51.51,
    sourceLon: -0.13,
    targetLat: 38.9,
    targetLon: -77.04,
    targetOrg: "FedTech Solutions",
    severity: "high",
    cves: ["CVE-2026-23760"],
  },
  {
    id: "arc-lazarus-bybit",
    actorName: "Lazarus Group",
    campaignName: "Bybit Heist",
    sourceLat: 39.02,
    sourceLon: 125.75,
    targetLat: 37.77,
    targetLon: -122.42,
    targetOrg: "NexGen Software",
    severity: "critical",
    cves: [],
  },
  {
    id: "arc-promptspy-android",
    actorName: "PromptSpy Operators",
    sourceLat: 23.81,
    sourceLon: 90.41,
    targetLat: 37.39,
    targetLon: -122.08,
    targetOrg: "Bay Area Health Network",
    severity: "high",
    cves: ["CVE-2026-31247"],
  },
];

const DEMO_ATTACK_PATH = {
  nodes: ["APT28", "CVE-2026-1731", "BeyondTrust PRA", "Pacific Financial Group"],
  edges: [
    "APT28->CVE-2026-1731",
    "CVE-2026-1731->BeyondTrust PRA",
    "BeyondTrust PRA->Pacific Financial Group",
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseStats(data: Record<string, unknown>): GraphStats {
  const raw = (data.stats || data) as Record<string, unknown>;
  const toNum = (v: unknown): number => {
    if (typeof v === "number") return v;
    if (v && typeof v === "object" && "low" in v) return (v as { low: number }).low;
    return 0;
  };
  return {
    nodeCount: toNum(raw.nodeCount),
    edgeCount: toNum(raw.edgeCount),
    threatActorCount: toNum(raw.threatActorCount ?? raw.actorCount),
    vulnerabilityCount: toNum(raw.vulnerabilityCount ?? raw.vulnCount),
    criticalCount: toNum(raw.criticalCount),
    activeScouts: toNum(raw.activeScouts),
    lastUpdate: new Date().toLocaleTimeString(),
  };
}

function deriveArcs(nodes: GraphNode[], edges: GraphEdge[]): AttackArc[] {
  const nodeMap = new Map<string, GraphNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  const adj = new Map<string, Set<string>>();
  for (const e of edges) {
    const s = typeof e.source === "string" ? e.source : e.source;
    const t = typeof e.target === "string" ? e.target : e.target;
    if (!adj.has(s)) adj.set(s, new Set());
    adj.get(s)!.add(t);
  }

  const arcs: AttackArc[] = [];
  const actors = nodes.filter((n) => n.type === "ThreatActor" && n.lat != null && n.lon != null);

  for (const actor of actors) {
    const visited = new Set<string>();
    const queue: { id: string; depth: number; cves: string[] }[] = [{ id: actor.id, depth: 0, cves: [] }];
    visited.add(actor.id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth > 6) continue;

      const currentNode = nodeMap.get(current.id);
      if (currentNode?.type === "Organization" && currentNode.lat != null && currentNode.lon != null && current.depth > 0) {
        let maxCvss = 5;
        for (const cveId of current.cves) {
          const cveNode = nodeMap.get(cveId);
          if (cveNode?.cvss && cveNode.cvss > maxCvss) maxCvss = cveNode.cvss;
        }
        const severity = maxCvss >= 9 ? "critical" : maxCvss >= 7 ? "high" : maxCvss >= 4 ? "medium" : "low";

        arcs.push({
          id: `arc-${actor.id}-${currentNode.id}`,
          actorName: actor.name,
          sourceLat: actor.lat!,
          sourceLon: actor.lon!,
          targetLat: currentNode.lat!,
          targetLon: currentNode.lon!,
          targetOrg: currentNode.name,
          severity: severity as AttackArc["severity"],
          cves: current.cves,
        });
        continue;
      }

      const neighbors = adj.get(current.id);
      if (!neighbors) continue;
      for (const nId of neighbors) {
        if (visited.has(nId)) continue;
        visited.add(nId);
        const neighbor = nodeMap.get(nId);
        const cves = [...current.cves];
        if (neighbor?.type === "Vulnerability" && neighbor.cve_id) {
          cves.push(neighbor.cve_id);
        }
        queue.push({ id: nId, depth: current.depth + 1, cves });
      }
    }
  }

  return arcs;
}

// ---------------------------------------------------------------------------
// Stagger animation variants
// ---------------------------------------------------------------------------

const panelVariants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: 0.15 + i * 0.1, duration: 0.5, ease: [0, 0, 0.2, 1] as const },
  }),
};

// ---------------------------------------------------------------------------
// Dashboard Component
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>(DEMO_FEED_ITEMS);
  const [threatBrief, setThreatBrief] = useState<ThreatBriefType | null>(DEMO_BRIEF);
  const [stats, setStats] = useState<GraphStats>(DEFAULT_STATS);
  const [attackPath, setAttackPath] = useState<{ nodes: string[]; edges: string[] } | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const [activeScoutIds, setActiveScoutIds] = useState<string[]>([]);
  const [isPolling, setIsPolling] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBriefLoading, setIsBriefLoading] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [trajectoryTaskId, setTrajectoryTaskId] = useState<string | null>(null);
  const [trajectoryOpen, setTrajectoryOpen] = useState(false);

  const arcs = useMemo<AttackArc[]>(() => {
    if (isDemoMode) return DEMO_ARCS;
    const derived = deriveArcs(nodes, edges);
    return derived.length > 0 ? derived : DEMO_ARCS;
  }, [nodes, edges, isDemoMode]);

  // -----------------------------------------------------------------------
  // Initialization
  // -----------------------------------------------------------------------
  useEffect(() => {
    async function init() {
      setIsLoading(true);
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
            ...parseStats(statsData),
            activeScouts: prev.activeScouts,
          }));
        }

        const scoutsCreated = typeof window !== "undefined" && localStorage.getItem("threatgraph_scout_ids");
        if (scoutsCreated) {
          try {
            const ids = JSON.parse(scoutsCreated) as string[];
            if (ids.length > 0) {
              setActiveScoutIds(ids);
              setIsPolling(true);
            }
          } catch {
            // Invalid stored data
          }
        }

        if (!scoutsCreated) {
          try {
            const scoutsRes = await fetch("/api/scouts/create", { method: "POST" });
            if (scoutsRes.ok) {
              const scoutsData = await scoutsRes.json();
              if (scoutsData.success && scoutsData.scouts?.length > 0) {
                const ids = scoutsData.scouts.map((s: { id: string }) => s.id);
                setActiveScoutIds(ids);
                setIsPolling(true);
                localStorage.setItem("threatgraph_scout_ids", JSON.stringify(ids));
                setStats((prev) => ({ ...prev, activeScouts: ids.length }));
                toast.success(`${ids.length} autonomous scouts deployed`);
              }
            }
          } catch {
            // Scout creation failed
          }
        }
      } catch {
        setStats({
          nodeCount: 123,
          edgeCount: 347,
          threatActorCount: 15,
          vulnerabilityCount: 30,
          criticalCount: 8,
          activeScouts: 4,
          lastUpdate: new Date().toLocaleTimeString(),
        });
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  // -----------------------------------------------------------------------
  // Polling loop
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isPolling || activeScoutIds.length === 0) return;

    const pollInterval = isDemoMode ? 10000 : 30000;

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
                if (result.newNodes?.length > 0) {
                  setNodes((prev) => {
                    const existingIds = new Set(prev.map((n) => n.id));
                    const unique = result.newNodes
                      .filter((n) => !existingIds.has(n.id))
                      .map((n) => ({ ...n, isNew: true }));
                    return [...prev, ...unique];
                  });
                }
                if (result.newEdges?.length > 0) {
                  setEdges((prev) => {
                    const existingIds = new Set(prev.map((e) => e.id));
                    const unique = result.newEdges.filter((e) => !existingIds.has(e.id));
                    return [...prev, ...unique];
                  });
                }
                if (result.feedItems?.length > 0) {
                  setFeedItems((prev) => [...result.feedItems, ...prev].slice(0, 50));
                }
                if (result.threatBrief) {
                  setThreatBrief(result.threatBrief);
                }

                result.feedItems
                  ?.filter((f) => f.severity === "critical")
                  .forEach((item) => {
                    toast.error(item.title, { description: item.description });
                  });

                try {
                  const statsRes = await fetch("/api/graph/stats");
                  if (statsRes.ok) {
                    const statsData = await statsRes.json();
                    setStats((prev) => ({
                      ...parseStats(statsData),
                      activeScouts: prev.activeScouts,
                    }));
                  }
                } catch {
                  // Non-critical
                }
              }
            }
          }
        } catch {
          // Silent fail
        }
      }
    }, pollInterval);

    return () => clearInterval(interval);
  }, [isPolling, activeScoutIds, isDemoMode]);

  // -----------------------------------------------------------------------
  // Attack path handler
  // -----------------------------------------------------------------------
  const handleFindAttackPath = useCallback(
    async (actorName: string, orgName: string) => {
      if (isDemoMode) {
        setAttackPath(DEMO_ATTACK_PATH);
        toast.success(`Attack path: ${actorName} to ${orgName}`);
        return;
      }

      try {
        const res = await fetch("/api/graph/path", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actorName, orgName }),
        });
        const data = await res.json();
        if (data.path) {
          const pathNodes = data.path.nodes.map((n: { id?: string; name?: string }) => n.id || n.name);
          const pathEdges = data.path.edges.map(
            (e: { source: string; target: string }) => `${e.source}->${e.target}`
          );
          setAttackPath({ nodes: pathNodes, edges: pathEdges });
          toast.success(`Attack path found: ${actorName} to ${orgName}`);
        } else {
          toast.info(`No attack path found from ${actorName} to ${orgName}`);
        }
      } catch {
        toast.error("Failed to find attack path");
      }
    },
    [isDemoMode]
  );

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      setSelectedNode(node);
      if (node.type === "ThreatActor") {
        const orgTargets = [
          "Pacific Financial Group",
          "Western Grid Authority",
          "FedTech Solutions",
          "Bay Area Health Network",
          "NexGen Software",
        ];
        for (const org of orgTargets) {
          handleFindAttackPath(node.name, org);
          break;
        }
      } else {
        setAttackPath(null);
      }
    },
    [handleFindAttackPath]
  );

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
          ...parseStats(statsData),
          activeScouts: prev.activeScouts,
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

  const toggleDemoMode = useCallback(() => {
    setIsDemoMode((prev) => {
      const next = !prev;
      if (next) {
        toast("Demo mode active — using pre-seeded data", { icon: "🔬" });
        setAttackPath(DEMO_ATTACK_PATH);
        setFeedItems(DEMO_FEED_ITEMS);
        setThreatBrief(DEMO_BRIEF);
        setStats({
          nodeCount: 123,
          edgeCount: 347,
          threatActorCount: 15,
          vulnerabilityCount: 30,
          criticalCount: 8,
          activeScouts: 4,
          lastUpdate: new Date().toLocaleTimeString(),
        });
      } else {
        toast("Demo mode disabled — using live data");
        setAttackPath(null);
        handleRefresh();
      }
      return next;
    });
  }, [handleRefresh]);

  // -----------------------------------------------------------------------
  // Loading skeleton
  // -----------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: '#060a13' }}>
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-[rgba(255,255,255,0.04)] border-t-[#ff3b3b] animate-spin" />
            <div className="absolute inset-1 rounded-full border border-[rgba(255,255,255,0.02)] border-b-[#54a0ff] animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>
          <div className="text-[#64748b] text-xs font-mono tracking-wider">Initializing ARGUS...</div>
          <div className="text-[#334155] text-[10px] mt-2 font-mono">Loading knowledge graph and deploying scouts</div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#060a13]">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden tg-atmosphere tg-scanline relative">
        {/* Header */}
        <Header
          stats={stats}
          threatLevel={threatBrief?.overall_threat_level || "moderate"}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          isDemoMode={isDemoMode}
          onToggleDemo={toggleDemoMode}
        />

        {/* Main Grid */}
        <div className="flex-1 grid grid-cols-[55%_45%] grid-rows-[55%_45%] overflow-hidden relative z-10"
          style={{ gap: '1px', background: 'rgba(255, 255, 255, 0.02)' }}
        >
        {/* Top Left: D3.js Force Graph */}
        <motion.div
          className="relative overflow-hidden"
          style={{ background: '#060a13' }}
          custom={0}
          initial="hidden"
          animate="visible"
          variants={panelVariants}
        >
          <ThreatGraph
            nodes={nodes}
            edges={edges}
            attackPath={attackPath}
            onNodeClick={handleNodeClick}
          />
        </motion.div>

        {/* Top Right: Attack Map + floating stat tabs */}
        <motion.div
          className="relative overflow-hidden"
          style={{ background: '#060a13' }}
          custom={1}
          initial="hidden"
          animate="visible"
          variants={panelVariants}
        >
          <AttackMap arcs={arcs} />

          {/* Floating stat tabs — top-left of map */}
          <div className="absolute top-3 left-3 z-20">
            <ExpandableTabs
              tabs={[
                { title: `${stats.nodeCount} Nodes`, icon: CircuitBoard },
                { title: `${stats.edgeCount} Edges`, icon: GitBranch },
                { type: "separator" as const },
                { title: `${stats.threatActorCount} Actors`, icon: Skull },
                { title: `${stats.vulnerabilityCount} Vulns`, icon: Bug },
                { title: `${stats.criticalCount} Critical`, icon: AlertTriangle },
                { type: "separator" as const },
                { title: `${stats.activeScouts} Scouts`, icon: Radio },
              ]}
              size="sm"
              activeColor="text-red-400"
              className="border-white/[0.06] bg-[rgba(6,10,19,0.75)] backdrop-blur-md shadow-lg shadow-black/20"
            />
          </div>
        </motion.div>

        {/* Bottom Left: LiveFeed + ThreatBrief */}
        <motion.div
          className="overflow-hidden"
          style={{ background: '#060a13' }}
          custom={2}
          initial="hidden"
          animate="visible"
          variants={panelVariants}
        >
          <div className="h-full grid grid-cols-[40%_60%]" style={{ gap: '1px', background: 'rgba(255, 255, 255, 0.02)' }}>
            <div style={{ background: '#060a13' }} className="overflow-hidden">
              <LiveFeed items={feedItems} />
            </div>
            <div style={{ background: '#060a13' }} className="overflow-hidden">
              <ThreatBrief brief={threatBrief} isLoading={isBriefLoading} />
            </div>
          </div>
        </motion.div>

        {/* Bottom Right: Bento Grid + Search */}
        <motion.div
          className="overflow-hidden flex flex-col"
          style={{ background: '#060a13' }}
          custom={3}
          initial="hidden"
          animate="visible"
          variants={panelVariants}
        >
          {/* Bento Grid — top portion */}
          <div className="flex-1 min-h-0 p-3">
            <div className="h-full grid grid-cols-2 grid-rows-2 gap-2">
              <BentoItem
                title="Threat Graph"
                description="Real-time entity relationship mapping across the global threat landscape"
                icon={<CircuitBoard className="h-4 w-4" />}
                accentColor="rgba(239, 68, 68, 0.6)"
              >
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold text-slate-200" style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}>{stats.nodeCount}</span>
                  <span className="text-[9px] text-slate-600">nodes</span>
                  <span className="text-[9px] text-slate-700 mx-0.5">/</span>
                  <span className="text-lg font-bold text-slate-200" style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}>{stats.edgeCount}</span>
                  <span className="text-[9px] text-slate-600">edges</span>
                </div>
              </BentoItem>

              <BentoItem
                title="Global Monitor"
                description="Cross-border attack vector tracking with nation-state origin attribution"
                icon={<Globe className="h-4 w-4" />}
                accentColor="rgba(59, 130, 246, 0.6)"
              >
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold text-blue-400" style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}>{arcs.length}</span>
                  <span className="text-[9px] text-slate-600">active arcs</span>
                </div>
              </BentoItem>

              <BentoItem
                title="AI Briefing"
                description="Autonomous threat assessment with continuous CISA gap coverage"
                icon={<Zap className="h-4 w-4" />}
                accentColor="rgba(168, 85, 247, 0.6)"
              >
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider ${
                    threatBrief?.overall_threat_level === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    threatBrief?.overall_threat_level === 'high' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                    'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  }`}>
                    {threatBrief?.overall_threat_level || 'analyzing'}
                  </span>
                  <span className="text-[9px] text-slate-600">{stats.criticalCount} critical</span>
                </div>
              </BentoItem>

              <BentoItem
                title="Scout Fleet"
                description="Autonomous agents monitoring NVD, GitHub, Twitter, and dark web feeds"
                icon={<Radio className="h-4 w-4" />}
                accentColor="rgba(46, 213, 115, 0.6)"
              >
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold text-emerald-400" style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}>{stats.activeScouts}</span>
                  <span className="text-[9px] text-slate-600">active scouts</span>
                </div>
              </BentoItem>
            </div>
          </div>

          {/* Search — bottom portion */}
          <div className="shrink-0 border-t border-white/[0.04]" style={{ height: '40%' }}>
            <SearchBar
              onResults={handleSearchResults}
              onViewTrajectory={handleViewTrajectory}
            />
          </div>
        </motion.div>
      </div>

      {/* Trajectory Modal */}
      <TrajectoryViewer
        open={trajectoryOpen}
        onOpenChange={setTrajectoryOpen}
        taskId={trajectoryTaskId}
      />
      </div>
    </div>
  );
}
