'use client';

import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import SpriteText from 'three-spritetext';
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { GraphNode, GraphEdge, NodeType } from '@/lib/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ThreatGraph3DProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  attackPath?: { nodes: string[]; edges: string[] } | null;
  onNodeClick?: (node: GraphNode) => void;
}

// ---------------------------------------------------------------------------
// Node color & size config per type
// ---------------------------------------------------------------------------

const NODE_COLORS: Record<NodeType, string> = {
  ThreatActor: '#ff4757',
  Vulnerability: '#ffa502',
  Exploit: '#ff9f43',
  Software: '#54a0ff',
  Organization: '#2ed573',
  Malware: '#c56cf0',
  Campaign: '#ffdd57',
  AttackTechnique: '#778ca3',
};

// nodeVal controls sphere volume — larger value = bigger sphere
const NODE_VALUES: Record<NodeType, number> = {
  ThreatActor: 30,
  Organization: 25,
  Campaign: 22,
  Malware: 20,
  Exploit: 18,
  Software: 16,
  Vulnerability: 15,
  AttackTechnique: 10,
};

// Which node types get visible text labels
const LABELED_TYPES = new Set<NodeType>([
  'ThreatActor',
  'Organization',
  'Campaign',
  'Malware',
  'Exploit',
  'Vulnerability',
  'Software',
]);

function getVulnColor(cvss?: number): string {
  if (cvss == null) return NODE_COLORS.Vulnerability;
  if (cvss >= 9) return '#ff4757';
  if (cvss >= 7) return '#ff6348';
  if (cvss >= 4) return '#ffa502';
  return '#778ca3';
}

function getVulnValue(cvss?: number): number {
  if (cvss == null) return NODE_VALUES.Vulnerability;
  if (cvss >= 9) return 28;
  if (cvss >= 7) return 22;
  if (cvss >= 4) return 16;
  return 12;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '\u2026' : str;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ThreatGraph3D({
  nodes,
  edges,
  attackPath,
  onNodeClick,
}: ThreatGraph3DProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(undefined);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Memoize attack path sets for O(1) lookups
  const attackNodeSet = useMemo(
    () => new Set(attackPath?.nodes ?? []),
    [attackPath],
  );
  const attackEdgeSet = useMemo(
    () => new Set(attackPath?.edges ?? []),
    [attackPath],
  );

  // Build graph data
  const graphData = useMemo(() => {
    const graphNodes = nodes.map((n) => ({
      ...n,
      fx: n.fx ?? undefined,
      fy: n.fy ?? undefined,
    }));
    const graphLinks = edges.map((e) => ({
      ...e,
      source: e.source,
      target: e.target,
    }));
    return { nodes: graphNodes, links: graphLinks };
  }, [nodes, edges]);

  // -----------------------------------------------------------------------
  // Bloom post-processing (once after mount)
  // -----------------------------------------------------------------------
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;

    const timer = setTimeout(() => {
      try {
        const bloomPass = new UnrealBloomPass(
          new THREE.Vector2(window.innerWidth, window.innerHeight),
          0.8,  // strength — subtle glow, not blinding
          0.4,  // radius — tight glow around nodes
          0.3,  // threshold — only bright objects bloom
        );
        fg.postProcessingComposer().addPass(bloomPass);
      } catch {
        // Bloom setup failed — continue without it
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // -----------------------------------------------------------------------
  // Force simulation tuning: tighter graph
  // -----------------------------------------------------------------------
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;

    const timer = setTimeout(() => {
      try {
        // Moderate charge — tight enough to cluster, not so strong nodes overlap
        fg.d3Force('charge')?.strength(-50);

        // Shorter link distance for tighter clusters
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fg.d3Force('link')?.distance((link: any) => {
          const key = `${link.source?.id ?? link.source}->${link.target?.id ?? link.target}`;
          return attackEdgeSet.has(key) ? 25 : 35;
        });

        fg.d3ReheatSimulation();
      } catch {
        // Force config failed — use defaults
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [attackEdgeSet]);

  // -----------------------------------------------------------------------
  // Auto-rotate: enable after 5s of no interaction
  // -----------------------------------------------------------------------
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const controls = fgRef.current?.controls() as any;
    if (controls) controls.autoRotate = false;

    idleTimerRef.current = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = fgRef.current?.controls() as any;
      if (c) {
        c.autoRotate = true;
        c.autoRotateSpeed = 0.4;
      }
    }, 5000);
  }, []);

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  // -----------------------------------------------------------------------
  // Node color callback
  // -----------------------------------------------------------------------
  const nodeColor = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any) => {
      const n = node as GraphNode;
      if (attackNodeSet.has(n.id)) return '#ff00ff'; // magenta for attack path
      if (n.type === 'Vulnerability') return getVulnColor(n.cvss);
      return NODE_COLORS[n.type] ?? '#778ca3';
    },
    [attackNodeSet],
  );

  // -----------------------------------------------------------------------
  // Node size callback
  // -----------------------------------------------------------------------
  const nodeVal = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any) => {
      const n = node as GraphNode;
      if (n.type === 'Vulnerability') return getVulnValue(n.cvss);
      return NODE_VALUES[n.type] ?? 10;
    },
    [],
  );

  // -----------------------------------------------------------------------
  // Label sprites — rendered ON TOP of default spheres (extend=true)
  // -----------------------------------------------------------------------
  const nodeThreeObject = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any) => {
      const n = node as GraphNode;
      const isOnAttackPath = attackNodeSet.has(n.id);
      const showLabel = LABELED_TYPES.has(n.type) || isOnAttackPath;

      if (!showLabel) return new THREE.Object3D(); // empty — nothing extra

      const label = new SpriteText(truncate(n.name, 24));
      label.color = '#ffffff';
      label.textHeight = 8;
      label.fontWeight = 'bold';
      label.backgroundColor = 'rgba(0, 0, 3, 0.85)';
      label.borderRadius = 4;
      label.padding = 3;
      // Shift label above the default sphere — negative y pushes up
      label.center.set(0.5, 2.2);

      return label;
    },
    [attackNodeSet],
  );

  // -----------------------------------------------------------------------
  // Edge styling
  // -----------------------------------------------------------------------
  const linkColor = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (link: any) => {
      const key = `${link.source?.id ?? link.source}->${link.target?.id ?? link.target}`;
      return attackEdgeSet.has(key) ? '#ff00ff' : 'rgba(136, 160, 210, 0.35)';
    },
    [attackEdgeSet],
  );

  const linkWidth = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (link: any) => {
      const key = `${link.source?.id ?? link.source}->${link.target?.id ?? link.target}`;
      return attackEdgeSet.has(key) ? 3 : 1.5;
    },
    [attackEdgeSet],
  );

  const linkParticles = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (link: any) => {
      const key = `${link.source?.id ?? link.source}->${link.target?.id ?? link.target}`;
      return attackEdgeSet.has(key) ? 6 : 2;
    },
    [attackEdgeSet],
  );

  const linkParticleColor = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (link: any) => {
      const key = `${link.source?.id ?? link.source}->${link.target?.id ?? link.target}`;
      return attackEdgeSet.has(key) ? '#ff00ff' : 'rgba(136, 160, 210, 0.6)';
    },
    [attackEdgeSet],
  );

  // -----------------------------------------------------------------------
  // Interactions
  // -----------------------------------------------------------------------
  const handleNodeClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any) => {
      resetIdleTimer();
      const fg = fgRef.current;
      if (fg) {
        const distance = 120;
        const nodePos = { x: node.x || 0, y: node.y || 0, z: node.z || 0 };
        const dist = Math.hypot(nodePos.x, nodePos.y, nodePos.z) || 1;
        const distRatio = 1 + distance / dist;
        fg.cameraPosition(
          {
            x: nodePos.x * distRatio,
            y: nodePos.y * distRatio,
            z: nodePos.z * distRatio,
          },
          nodePos,
          2000,
        );
      }
      if (onNodeClick) onNodeClick(node as GraphNode);
    },
    [onNodeClick, resetIdleTimer],
  );

  const handleNodeHover = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any) => {
      resetIdleTimer();
      const el = fgRef.current?.renderer()?.domElement;
      if (el) el.style.cursor = node ? 'pointer' : 'default';
    },
    [resetIdleTimer],
  );

  const handleEngineStop = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const controls = fgRef.current?.controls() as any;
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.4;
    }
  }, []);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <ForceGraph3D
      ref={fgRef}
      graphData={graphData}
      backgroundColor="#000003"
      showNavInfo={false}
      // Node styling — default spheres with per-type color and sizing
      nodeColor={nodeColor}
      nodeVal={nodeVal}
      nodeRelSize={6}
      nodeOpacity={0.85}
      nodeResolution={16}
      // Labels on top of default spheres
      nodeThreeObject={nodeThreeObject}
      nodeThreeObjectExtend={true}
      // Link styling — visible with directional particles
      linkColor={linkColor}
      linkWidth={linkWidth}
      linkOpacity={0.8}
      linkDirectionalParticles={linkParticles}
      linkDirectionalParticleSpeed={0.006}
      linkDirectionalParticleWidth={2}
      linkDirectionalParticleColor={linkParticleColor}
      linkDirectionalArrowLength={4}
      linkDirectionalArrowRelPos={0.85}
      linkDirectionalArrowColor={linkColor}
      linkCurvature={0.1}
      // Interaction
      onNodeClick={handleNodeClick}
      onNodeHover={handleNodeHover}
      onEngineStop={handleEngineStop}
      enableNodeDrag={true}
      enableNavigationControls={true}
      // Simulation
      warmupTicks={100}
      cooldownTime={5000}
      nodeId="id"
      linkSource="source"
      linkTarget="target"
    />
  );
}
