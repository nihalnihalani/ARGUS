"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { X, ExternalLink, ShieldAlert, FileText, Fingerprint, Search, Sparkles, Loader2 } from "lucide-react";
import {
  CircuitBoard,
  GitBranch,
  Skull,
  Bug,
  AlertTriangle,
  Radio,
  Globe,
  Zap,
  Radar,
  Network,
  Scan,
} from "lucide-react";
import { IconShieldBolt } from "@tabler/icons-react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import ThreatGraph from "@/components/ThreatGraph";

const ThreatGraph3D = dynamic(() => import("@/components/ThreatGraph3D"), { ssr: false });
import AttackMap from "@/components/AttackMap";
import LiveFeed from "@/components/LiveFeed";
import ThreatBrief from "@/components/ThreatBrief";
import SearchBar from "@/components/SearchBar";
import ExtractionComparison from "@/components/ExtractionComparison";
import VisionAnalysis from "@/components/VisionAnalysis";
import TrajectoryViewer from "@/components/TrajectoryViewer";
import { RadarLoader } from "@/components/ui/radar-loader";
import { CommandPalette } from "@/components/CommandPalette";
import GraphStats from "@/components/GraphStats";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";
import type {
  GraphNode,
  GraphEdge,
  FeedItem,
  ThreatBrief as ThreatBriefType,
  GraphStats as GraphStatsType,
  AttackArc,
  PipelineResult,
  ExtractionComparison as ExtractionComparisonType,
  VisualAnalysis,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Default empty state — all data fetched live from Neo4j / Yutori / Tavily
// ---------------------------------------------------------------------------

const EMPTY_STATS: GraphStatsType = {
  nodeCount: 0,
  edgeCount: 0,
  threatActorCount: 0,
  vulnerabilityCount: 0,
  criticalCount: 0,
  activeScouts: 0,
  lastUpdate: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseStats(data: Record<string, unknown>): GraphStatsType {
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
    const s = typeof e.source === "string" ? e.source : (e.source as unknown as { id: string }).id;
    const t = typeof e.target === "string" ? e.target : (e.target as unknown as { id: string }).id;
    if (!adj.has(s)) adj.set(s, new Set());
    adj.get(s)!.add(t);
    // Also traverse reverse direction to find more paths
    if (!adj.has(t)) adj.set(t, new Set());
    adj.get(t)!.add(s);
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
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [threatBrief, setThreatBrief] = useState<ThreatBriefType | null>(null);
  const [stats, setStats] = useState<GraphStatsType>(EMPTY_STATS);
  const [attackPath, setAttackPath] = useState<{ nodes: string[]; edges: string[] } | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const [activeScoutIds, setActiveScoutIds] = useState<string[]>([]);
  const [isPolling, setIsPolling] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBriefLoading, setIsBriefLoading] = useState(false);
  const isDemoMode = false; // Demo mode removed — all data is live
  const [trajectoryTaskId, setTrajectoryTaskId] = useState<string | null>(null);
  const [trajectoryOpen, setTrajectoryOpen] = useState(false);
  
  // Sponsor integration state
  const [comparisonData, setComparisonData] = useState<ExtractionComparisonType | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [visionData, setVisionData] = useState<VisualAnalysis | null>(null);
  const [visionLoading, setVisionLoading] = useState(false);
  const [isInvestigating, setIsInvestigating] = useState(false);

  // Layout state
  const [activeVisualizer, setActiveVisualizer] = useState<'graph' | 'graph3d' | 'map'>('graph3d');
  const [activeTab, setActiveTab] = useState<'intelligence' | 'investigate' | 'sponsors'>('intelligence');

  const arcs = useMemo<AttackArc[]>(() => {
    return deriveArcs(nodes, edges);
  }, [nodes, edges]);

  // -----------------------------------------------------------------------
  // Initialization
  // -----------------------------------------------------------------------
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        // Step 1: Load graph data and stats from Neo4j
        const [graphRes, statsRes] = await Promise.all([
          fetch("/api/graph/query"),
          fetch("/api/graph/stats"),
        ]);

        if (graphRes.ok) {
          const graphData = await graphRes.json();
          if (graphData.nodes?.length > 0) {
            setNodes(graphData.nodes);
            setEdges(graphData.edges || []);
            setFeedItems((prev) => [
              {
                id: `sys-${Date.now()}-graph`,
                timestamp: new Date().toISOString(),
                severity: "info" as const,
                source: "system" as const,
                title: `Knowledge graph loaded: ${graphData.nodes.length} entities, ${(graphData.edges || []).length} relationships`,
                description: "Connected to Neo4j Aura — real-time threat intelligence graph active.",
              },
              ...prev,
            ]);
          }
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats((prev) => ({
            ...parseStats(statsData),
            activeScouts: prev.activeScouts,
          }));
        }

        // Step 2: Deploy or restore Yutori scouts
        const scoutsCreated = typeof window !== "undefined" && localStorage.getItem("threatgraph_scout_ids");
        if (scoutsCreated) {
          try {
            const ids = JSON.parse(scoutsCreated) as string[];
            if (ids.length > 0) {
              setActiveScoutIds(ids);
              setIsPolling(true);
              setStats((prev) => ({ ...prev, activeScouts: ids.length }));
              setFeedItems((prev) => [
                {
                  id: `sys-${Date.now()}-scouts`,
                  timestamp: new Date().toISOString(),
                  severity: "info" as const,
                  source: "system" as const,
                  title: `${ids.length} Yutori scouts resumed`,
                  description: "Autonomous scouts are polling for real-time threat intelligence from NVD, Twitter/X, GitHub, and security news sources.",
                },
                ...prev,
              ]);
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
                setFeedItems((prev) => [
                  {
                    id: `sys-${Date.now()}-deploy`,
                    timestamp: new Date().toISOString(),
                    severity: "info" as const,
                    source: "system" as const,
                    title: `${ids.length} Yutori scouts deployed`,
                    description: "Autonomous scouts are now monitoring NVD/CISA, Twitter/X security researchers, GitHub exploit PoCs, and major security news outlets.",
                  },
                  ...prev,
                ]);
              }
            }
          } catch {
            // Scout creation failed — continue without scouts
          }
        }

        // Step 3: Trigger a live pipeline ingest to populate feed with real-time data
        try {
          const pipelineRes = await fetch("/api/pipeline/ingest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scoutUpdate:
                "Recent threat intelligence: APT29 (Cozy Bear) has been observed exploiting CVE-2024-3400 in Palo Alto Networks PAN-OS to deploy WINELOADER malware targeting NATO diplomatic organizations. Volt Typhoon continues pre-positioning in US critical infrastructure using living-off-the-land techniques. LockBit 3.0 ransomware group exploiting ConnectWise ScreenConnect CVE-2024-1709 for initial access.",
            }),
          });
          if (pipelineRes.ok) {
            const result: PipelineResult = await pipelineRes.json();
            if (result.newNodes?.length) {
              setNodes((prev) => {
                const nodeMap = new Map(prev.map((n) => [n.id, n]));
                for (const n of result.newNodes) {
                  if (!nodeMap.has(n.id)) nodeMap.set(n.id, n);
                }
                return Array.from(nodeMap.values());
              });
            }
            if (result.newEdges?.length) {
              setEdges((prev) => {
                const edgeMap = new Map(prev.map((e) => [e.id, e]));
                for (const e of result.newEdges) {
                  if (!edgeMap.has(e.id)) edgeMap.set(e.id, e);
                }
                return Array.from(edgeMap.values());
              });
            }
            if (result.feedItems?.length) {
              setFeedItems((prev) => [...result.feedItems, ...prev].slice(0, 50));
            }
            if (result.threatBrief) {
              setThreatBrief(result.threatBrief);
            }
          }
        } catch {
          // Pipeline ingest is non-blocking
        }
      } catch (err) {
        console.error("[Dashboard/init]", err);
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

    const pollInterval = 30000;

    const interval = setInterval(async () => {
      for (const scoutId of activeScoutIds) {
        try {
          const res = await fetch(`/api/scouts/poll?id=${scoutId}`);
          const data = await res.json();
          if (data.updates?.length > 0) {
            // data.updates is { scoutId, updates: { id, content, ... }[] }[]
            const rawUpdates = data.updates.flatMap(
              (u: { updates: { content: string }[] }) => u.updates
            );
            for (const update of rawUpdates) {
              const pipelineRes = await fetch("/api/pipeline/ingest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ scoutUpdate: update.content }),
              });

              if (pipelineRes.ok) {
                const result: PipelineResult = await pipelineRes.json();
                if (result.newNodes?.length > 0) {
                  setNodes((prev) => {
                    const nodeMap = new Map(prev.map((n) => [n.id, n]));
                    for (const n of result.newNodes) {
                      if (!nodeMap.has(n.id)) nodeMap.set(n.id, { ...n, isNew: true });
                    }
                    return Array.from(nodeMap.values());
                  });
                }
                if (result.newEdges?.length > 0) {
                  setEdges((prev) => {
                    const edgeMap = new Map(prev.map((e) => [e.id, e]));
                    for (const e of result.newEdges) {
                      if (!edgeMap.has(e.id)) edgeMap.set(e.id, e);
                    }
                    return Array.from(edgeMap.values());
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
  }, [isPolling, activeScoutIds]);

  // -----------------------------------------------------------------------
  // Attack path handler
  // -----------------------------------------------------------------------
  const handleFindAttackPath = useCallback(
    async (actorName: string, orgName: string) => {
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
    []
  );

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      setSelectedNode(node);
      if (node.type === "ThreatActor") {
        // Find organization targets from the live graph
        const orgNodes = nodes.filter((n) => n.type === "Organization");
        if (orgNodes.length > 0) {
          handleFindAttackPath(node.name, orgNodes[0].name);
        }
      } else {
        setAttackPath(null);
      }
    },
    [handleFindAttackPath, nodes]
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

  const handleRunComparison = useCallback(async (text: string) => {
    setComparisonLoading(true);
    try {
      const res = await fetch("/api/gliner/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const data = await res.json();
        setComparisonData(data.comparison ?? data);
      }
    } catch {
      toast.error("Comparison failed");
    } finally {
      setComparisonLoading(false);
    }
  }, []);

  const handleAnalyzeScreenshot = useCallback(async (imageUrl: string) => {
    setVisionLoading(true);
    try {
      const res = await fetch("/api/reka/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setVisionData(data.analysis);
      }
    } catch {
      toast.error("Vision analysis failed");
    } finally {
      setVisionLoading(false);
    }
  }, []);

  // -----------------------------------------------------------------------
  // Deep Investigation handler
  // -----------------------------------------------------------------------
  const handleDeepInvestigation = useCallback(async () => {
    if (!selectedNode || isInvestigating) return;

    setIsInvestigating(true);
    toast.info(`Launching deep investigation on ${selectedNode.name}...`);

    try {
      // Build a context-rich query based on node type
      const typeContext: Record<string, string> = {
        ThreatActor: `Investigate threat actor "${selectedNode.name}". Find TTPs, recent campaigns, targets, affiliated groups, IOCs, and MITRE ATT&CK techniques. ${selectedNode.country ? `Known origin: ${selectedNode.country}.` : ''}`,
        Vulnerability: `Research vulnerability ${selectedNode.cve_id || selectedNode.name}. Find affected products, exploit availability, CVSS details, active exploitation in the wild, patches, and threat actors exploiting it. ${selectedNode.cvss ? `CVSS: ${selectedNode.cvss}.` : ''}`,
        Exploit: `Investigate exploit "${selectedNode.name}". Find associated CVEs, affected software, threat actors using it, proof-of-concept availability, and mitigation strategies.`,
        Malware: `Research malware "${selectedNode.name}". Find capabilities, delivery mechanisms, C2 infrastructure, attribution to threat groups, IOCs, and detection signatures. ${selectedNode.malware_type ? `Type: ${selectedNode.malware_type}.` : ''}`,
        Organization: `Investigate targeting of organization "${selectedNode.name}". Find recent attacks, threat actors targeting them, vulnerabilities in their infrastructure, and relevant campaigns.`,
        Software: `Research software "${selectedNode.name}" from a security perspective. Find known vulnerabilities, recent CVEs, exploit availability, and threat actors targeting it.`,
        Campaign: `Investigate campaign "${selectedNode.name}". Find attributed threat actors, TTPs used, targets, timeline, IOCs, and associated malware.`,
        AttackTechnique: `Research attack technique "${selectedNode.name}". ${selectedNode.mitre_id ? `MITRE ATT&CK ID: ${selectedNode.mitre_id}.` : ''} Find threat actors using it, associated malware, detection methods, and mitigations.`,
      };

      const query = typeContext[selectedNode.type] || `Deep threat intelligence investigation on "${selectedNode.name}" (type: ${selectedNode.type}).`;

      // Step 1: Create research task
      const createRes = await fetch("/api/research/deepdive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "Failed to create research task");
      const taskId = createData.research?.taskId;
      if (!taskId) throw new Error(`No task ID in response (got: ${JSON.stringify(createData)})`);

      toast.info("Research task deployed — polling for results...");

      // Step 2: Poll for completion (max ~2 min)
      let result = null;
      for (let i = 0; i < 24; i++) {
        await new Promise((r) => setTimeout(r, 5000));

        const pollRes = await fetch(`/api/research/deepdive?taskId=${taskId}`);
        if (!pollRes.ok) continue;

        const pollData = await pollRes.json();
        if (pollData.research?.failed) throw new Error("Research task failed");
        if (pollData.research?.completed) {
          result = pollData.research.result;
          break;
        }
      }

      if (!result) throw new Error("Research timed out");

      // Step 3: Pipe result through pipeline ingest to extract entities
      const summary = typeof result === "string" ? result : JSON.stringify(result);
      const pipelineRes = await fetch("/api/pipeline/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scoutUpdate: `Deep investigation results for ${selectedNode.name}: ${summary}`,
        }),
      });

      if (pipelineRes.ok) {
        const pipeResult: PipelineResult = await pipelineRes.json();
        if (pipeResult.newNodes?.length) {
          setNodes((prev) => {
            const nodeMap = new Map(prev.map((n) => [n.id, n]));
            for (const n of pipeResult.newNodes) {
              if (!nodeMap.has(n.id)) nodeMap.set(n.id, { ...n, isNew: true });
            }
            return Array.from(nodeMap.values());
          });
        }
        if (pipeResult.newEdges?.length) {
          setEdges((prev) => {
            const edgeMap = new Map(prev.map((e) => [e.id, e]));
            for (const e of pipeResult.newEdges) {
              if (!edgeMap.has(e.id)) edgeMap.set(e.id, e);
            }
            return Array.from(edgeMap.values());
          });
        }
        if (pipeResult.feedItems?.length) {
          setFeedItems((prev) => [...pipeResult.feedItems, ...prev].slice(0, 50));
        }
        if (pipeResult.threatBrief) {
          setThreatBrief(pipeResult.threatBrief);
        }

        const newCount = (pipeResult.newNodes?.length || 0) + (pipeResult.newEdges?.length || 0);
        toast.success(`Investigation complete — ${newCount} new intelligence items discovered`);
      } else {
        toast.success("Investigation complete — results received");
      }

      // Switch to Intelligence tab to see feed updates
      setActiveTab("intelligence");
    } catch (err) {
      console.error("[Deep Investigation]", err);
      toast.error(err instanceof Error ? err.message : "Investigation failed");
    } finally {
      setIsInvestigating(false);
    }
  }, [selectedNode, isInvestigating]);

  // Demo mode removed — all data is fetched live

  // -----------------------------------------------------------------------
  // Loading skeleton
  // -----------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: '#0A0E17' }}>
        <RadarLoader
          size={140}
          label="Initializing ARGUS..."
          sublabel="Loading knowledge graph and deploying scouts"
        />
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render Helpers
  // -----------------------------------------------------------------------

  const renderNodeDetails = () => {
    return (
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 w-[340px] h-full z-40 bg-[#0b0914]/95 backdrop-blur-2xl border-l border-indigo-500/10 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-indigo-500/10 bg-indigo-500/[0.02]">
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2.5 h-2.5 rounded-full shadow-[0_0_12px_currentColor] ${
                  selectedNode.type === 'ThreatActor' ? 'text-red-500 bg-red-500' :
                  selectedNode.type === 'Vulnerability' ? 'text-orange-500 bg-orange-500' :
                  selectedNode.type === 'Organization' ? 'text-green-500 bg-green-500' :
                  'text-fuchsia-500 bg-fuchsia-500'
                }`} />
                <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400">{selectedNode.type}</h3>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-md text-slate-500 hover:text-fuchsia-300 hover:bg-fuchsia-500/10 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <h2 className="text-lg font-bold text-white mb-4 tracking-tight leading-tight">{selectedNode.name}</h2>
              
              {/* Core Attributes */}
              <div className="flex flex-col gap-3 mb-6">
                {selectedNode.cve_id && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Fingerprint className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-wider">CVE ID</span>
                    </div>
                    <span className="text-sm font-mono text-white">{selectedNode.cve_id}</span>
                  </div>
                )}
                {selectedNode.cvss && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    <div className="flex items-center gap-2 text-slate-400">
                      <ShieldAlert className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-wider">CVSS Score</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${selectedNode.cvss >= 9 ? 'bg-red-500' : selectedNode.cvss >= 7 ? 'bg-orange-500' : 'bg-yellow-500'}`}
                          style={{ width: `${(selectedNode.cvss / 10) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-mono font-bold text-white">{selectedNode.cvss.toFixed(1)}</span>
                    </div>
                  </div>
                )}
                {selectedNode.country && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Globe className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-wider">Origin</span>
                    </div>
                    <span className="text-sm font-medium text-white">{selectedNode.country}</span>
                  </div>
                )}
              </div>

              {/* Description/Summary (Mocked or real if exists) */}
              <div className="mb-6">
                <h4 className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-widest mb-2">
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                  Intelligence Summary
                </h4>
                <p className="text-[13px] text-slate-400 leading-relaxed bg-white/[0.02] p-3 rounded-lg border border-white/[0.04]">
                  {((selectedNode as any).description) || `Automated intelligence gathering indicates active reconnaissance and exploitation campaigns involving ${selectedNode.name}. Our scouts are tracking this entity across multiple threat feeds and dark web sources.`}
                </p>
              </div>

              {/* Actions */}
              <div className="mt-auto pt-4">
                <button
                  onClick={handleDeepInvestigation}
                  disabled={isInvestigating}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:from-violet-800 disabled:to-fuchsia-800 disabled:opacity-60 text-white font-semibold text-sm shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] transition-all"
                >
                  {isInvestigating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Investigating...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Deep Investigation
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  const renderGraphPanel = () => (
    <div className="relative h-full w-full bg-[#0b0914] overflow-hidden group">
      {renderNodeDetails()}
      <ThreatGraph
        nodes={nodes}
        edges={edges}
        attackPath={attackPath}
        onNodeClick={handleNodeClick}
      />
    </div>
  );

  const renderGraph3DPanel = () => (
    <div className="relative h-full w-full bg-[#0b0914] overflow-hidden">
      {renderNodeDetails()}
      <ThreatGraph3D
        nodes={nodes}
        edges={edges}
        attackPath={attackPath}
        onNodeClick={handleNodeClick}
      />
    </div>
  );

  const renderMapPanel = () => (
    <div className="relative h-full w-full bg-[#0b0914] overflow-hidden group">
      <AttackMap arcs={arcs} />
    </div>
  );

  const renderFeedPanel = () => (
    <div className="flex-1 flex flex-col h-full bg-[#0b0914] overflow-y-auto custom-scrollbar">
      <ThreatBrief brief={threatBrief} isLoading={isBriefLoading} />
      <div className="border-t border-indigo-500/10" />
      <LiveFeed items={feedItems} />
    </div>
  );

  const renderInvestigatePanel = () => (
    <div className="flex-1 flex flex-col h-full bg-[#0b0914] overflow-hidden">
      <SearchBar
        onResults={handleSearchResults}
        onViewTrajectory={handleViewTrajectory}
      />
    </div>
  );

  const renderSponsorsPanel = () => (
    <div className="flex-1 flex flex-col h-full bg-[#0b0914] overflow-y-auto custom-scrollbar p-0">
      <ExtractionComparison
        data={comparisonData}
        isLoading={comparisonLoading}
        onRunComparison={handleRunComparison}
      />
      <div className="border-t border-indigo-500/10" />
      <VisionAnalysis
        analysis={visionData}
        isLoading={visionLoading}
        onAnalyze={handleAnalyzeScreenshot}
      />
    </div>
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0b0914] tg-atmosphere tg-scanline relative">
      {/* Header */}
      <Header
        stats={stats}
        threatLevel={threatBrief?.overall_threat_level || "moderate"}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        isDemoMode={false}
        onToggleDemo={() => {}}
        activeVisualizer={activeVisualizer}
        onVisualizerChange={setActiveVisualizer}
      />

        {/* Main Content Area: 2-Column Layout */}
        <div className="flex-1 overflow-hidden relative flex z-10">
          
      {/* Left Column: Visualizer */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0b0914] relative pointer-events-auto z-10">
        {/* Bottom Graph Stats */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
              <div className="bg-[#0b0914]/70 backdrop-blur-xl border border-indigo-500/20 rounded-xl p-1.5 shadow-[0_8px_32px_-8px_rgba(168,85,247,0.3)]">
                <GraphStats stats={stats} />
              </div>
            </div>

            <div className="flex-1 relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeVisualizer}
                  initial={{ opacity: 0, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, filter: 'blur(8px)' }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0"
                >
                  {activeVisualizer === 'graph3d' ? renderGraph3DPanel() : activeVisualizer === 'graph' ? renderGraphPanel() : renderMapPanel()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Right Column: Context & Tools */}
          <div className="w-[440px] shrink-0 border-l border-indigo-500/10 bg-[#0b0914]/90 backdrop-blur-xl flex flex-col shadow-[-8px_0_24px_-8px_rgba(0,0,0,0.5)] z-20">
            {/* Tabs */}
            <div className="flex items-center justify-center p-3 border-b border-indigo-500/10 bg-indigo-500/[0.01]">
              <ExpandableTabs
                tabs={[
                  { title: "Intelligence", icon: FileText },
                  { title: "Investigate", icon: Search },
                  { title: "Sponsors", icon: Sparkles },
                ]}
                activeColor="text-fuchsia-400"
                defaultSelected={activeTab === 'intelligence' ? 0 : activeTab === 'investigate' ? 1 : 2}
                onChange={(index) => {
                  if (index !== null) {
                    setActiveTab(index === 0 ? 'intelligence' : index === 1 ? 'investigate' : 'sponsors');
                  }
                }}
                className="w-full justify-center bg-indigo-500/[0.02] border-indigo-500/10 p-1"
              />
            </div>

            {/* Tab Content */}
            <div className="flex-1 relative overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 flex flex-col"
                >
                  {activeTab === 'intelligence' ? renderFeedPanel() : activeTab === 'investigate' ? renderInvestigatePanel() : renderSponsorsPanel()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

      {/* Trajectory Modal */}
      <TrajectoryViewer
        open={trajectoryOpen}
        onOpenChange={setTrajectoryOpen}
        taskId={trajectoryTaskId}
      />

      <CommandPalette
        onSwitchView={setActiveVisualizer}
        onSwitchTab={setActiveTab}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
