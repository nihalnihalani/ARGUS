'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, Maximize, Target, Search, Info, ShieldAlert } from 'lucide-react';
import type { GraphNode, GraphEdge, NodeType } from '@/lib/types';

// --- Shape path generators ---

function hexagonPath(r: number): string {
  const a = (Math.PI * 2) / 6;
  const pts = Array.from({ length: 6 }, (_, i) => {
    const angle = a * i - Math.PI / 2;
    return `${r * Math.cos(angle)},${r * Math.sin(angle)}`;
  });
  return `M${pts.join('L')}Z`;
}

function diamondPath(r: number): string {
  return `M0,${-r} L${r},0 L0,${r} L${-r},0 Z`;
}

function trianglePath(r: number): string {
  const h = r * 1.2;
  return `M0,${-h} L${h * 0.866},${h * 0.5} L${-h * 0.866},${h * 0.5} Z`;
}

function pentagonPath(r: number): string {
  const a = (Math.PI * 2) / 5;
  const pts = Array.from({ length: 5 }, (_, i) => {
    const angle = a * i - Math.PI / 2;
    return `${r * Math.cos(angle)},${r * Math.sin(angle)}`;
  });
  return `M${pts.join('L')}Z`;
}

function roundedRectPath(w: number, h: number, rx: number): string {
  return `M${-w / 2 + rx},${-h / 2}
    L${w / 2 - rx},${-h / 2}
    Q${w / 2},${-h / 2} ${w / 2},${-h / 2 + rx}
    L${w / 2},${h / 2 - rx}
    Q${w / 2},${h / 2} ${w / 2 - rx},${h / 2}
    L${-w / 2 + rx},${h / 2}
    Q${-w / 2},${h / 2} ${-w / 2},${h / 2 - rx}
    L${-w / 2},${-h / 2 + rx}
    Q${-w / 2},${-h / 2} ${-w / 2 + rx},${-h / 2}
    Z`;
}

// --- Node style config ---

interface NodeStyle {
  color: string;
  radius: number;
  shape: 'circle' | 'diamond' | 'rounded-rect' | 'hexagon' | 'triangle' | 'pentagon' | 'small-circle' | 'crosshair-circle';
}

function getNodeStyle(node: GraphNode): NodeStyle {
  switch (node.type) {
    case 'ThreatActor':
      return { color: '#ff4757', radius: 16, shape: 'crosshair-circle' };
    case 'Vulnerability': {
      const cvss = node.cvss ?? 5;
      const t = Math.min(cvss / 10, 1);
      const r = Math.round(34 + (239 - 34) * t);
      const g = Math.round(197 - (197 - 68) * t);
      const b = Math.round(94 - (94 - 68) * t);
      return { color: `rgb(${r},${g},${b})`, radius: 8 + (cvss ?? 5), shape: 'circle' };
    }
    case 'Exploit':
      return { color: '#ff9f43', radius: 8, shape: 'diamond' };
    case 'Software':
      return { color: '#54a0ff', radius: 12, shape: 'rounded-rect' };
    case 'Organization':
      return { color: '#2ed573', radius: 16, shape: 'hexagon' };
    case 'Malware':
      return { color: '#c56cf0', radius: 12, shape: 'triangle' };
    case 'Campaign':
      return { color: '#ffdd57', radius: 12, shape: 'pentagon' };
    case 'AttackTechnique':
      return { color: '#778ca3', radius: 8, shape: 'small-circle' };
    default:
      return { color: '#778ca3', radius: 8, shape: 'circle' };
  }
}

function getShapePath(shape: NodeStyle['shape'], radius: number): string | null {
  switch (shape) {
    case 'diamond':
      return diamondPath(radius);
    case 'hexagon':
      return hexagonPath(radius);
    case 'triangle':
      return trianglePath(radius);
    case 'pentagon':
      return pentagonPath(radius);
    case 'rounded-rect':
      return roundedRectPath(radius * 2, radius * 1.5, 4);
    default:
      return null;
  }
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '...' : s;
}

// --- Tooltip content ---

function getTooltipContent(node: GraphNode): { type: string; name: string; details: string[] } {
  const details: string[] = [];
  if (node.cve_id) details.push(`CVE: ${node.cve_id}`);
  if (node.cvss != null) details.push(`CVSS: ${node.cvss}`);
  if (node.severity) details.push(`Severity: ${node.severity}`);
  if (node.country) details.push(`Country: ${node.country}`);
  if (node.motivation) details.push(`Motivation: ${node.motivation}`);
  if (node.malware_type) details.push(`Type: ${node.malware_type}`);
  if (node.mitre_id) details.push(`MITRE: ${node.mitre_id}`);
  if (node.affected_product) details.push(`Product: ${node.affected_product}`);
  return { type: node.type, name: node.name, details };
}

// --- Component Props ---

interface ThreatGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  attackPath?: { nodes: string[]; edges: string[] } | null;
  onNodeClick?: (node: GraphNode) => void;
  onNodeHover?: (node: GraphNode | null) => void;
  width?: number;
  height?: number;
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface SimLink {
  id: string;
  source: SimNode | string;
  target: SimNode | string;
  relationship: string;
  isAttackPath?: boolean;
}

// --- Main Component ---

export default function ThreatGraph({
  nodes,
  edges,
  attackPath,
  onNodeClick,
  onNodeHover,
  width: propWidth,
  height: propHeight,
}: ThreatGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [simLinks, setSimLinks] = useState<SimLink[]>([]);
  const [transform, setTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    node: GraphNode;
  } | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: propWidth ?? 800, height: propHeight ?? 600 });
  const [hiddenNodeTypes, setHiddenNodeTypes] = useState<Set<NodeType>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: GraphNode } | null>(null);

  // Responsive sizing
  useEffect(() => {
    if (propWidth && propHeight) {
      setDimensions({ width: propWidth, height: propHeight });
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) setDimensions({ width: w, height: h });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [propWidth, propHeight]);

  const w = dimensions.width;
  const h = dimensions.height;

  // Build / update simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    const visibleNodes = nodes.filter(n => !hiddenNodeTypes.has(n.type as NodeType));
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));

    const nodeMap = new Map<string, SimNode>();
    const existingMap = new Map<string, SimNode>();
    if (simulationRef.current) {
      simulationRef.current.nodes().forEach((n) => existingMap.set(n.id, n));
    }

    const newSimNodes: SimNode[] = visibleNodes.map((n) => {
      const existing = existingMap.get(n.id);
      if (existing) {
        return { ...n, x: existing.x, y: existing.y, fx: existing.fx, fy: existing.fy } as SimNode;
      }
      return { ...n, x: w / 2 + (Math.random() - 0.5) * 200, y: h / 2 + (Math.random() - 0.5) * 200 } as SimNode;
    });
    newSimNodes.forEach((n) => nodeMap.set(n.id, n));

    const newSimLinks: SimLink[] = edges
      .filter((e) => {
        const s = typeof e.source === 'string' ? e.source : e.source;
        const t = typeof e.target === 'string' ? e.target : e.target;
        return visibleNodeIds.has(s) && visibleNodeIds.has(t);
      })
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        relationship: e.relationship,
        isAttackPath: e.isAttackPath,
      }));

    if (simulationRef.current) simulationRef.current.stop();

    const sim = d3
      .forceSimulation<SimNode>(newSimNodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimLink>(newSimLinks)
          .id((d) => d.id)
          .distance(80)
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(w / 2, h / 2))
      .force('collision', d3.forceCollide<SimNode>().radius((d) => getNodeStyle(d).radius + 4))
      .alphaDecay(0.02)
      .on('tick', () => {
        setSimNodes([...sim.nodes()]);
        setSimLinks([...(sim.force('link') as d3.ForceLink<SimNode, SimLink>).links()]);
      });

    simulationRef.current = sim;

    return () => {
      sim.stop();
    };
  }, [nodes, edges, w, h, hiddenNodeTypes]);

  // Zoom behavior
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 6])
      .on('zoom', (event) => {
        transformRef.current = event.transform;
        setTransform(event.transform);
      });
    svg.call(zoomBehavior);
    zoomBehaviorRef.current = zoomBehavior;
    return () => {
      svg.on('.zoom', null);
      zoomBehaviorRef.current = null;
    };
  }, []);

  // Graph controls
  const handleZoomIn = useCallback((e) => {
    console.log("zoom in clicked");
    e.stopPropagation();
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    zoomBehaviorRef.current.scaleBy(d3.select(svgRef.current), 1.3);
  }, []);

  const handleZoomOut = useCallback((e) => {
    console.log("zoom out clicked");
    e.stopPropagation();
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    zoomBehaviorRef.current.scaleBy(d3.select(svgRef.current), 0.7);
  }, []);

  const handleFitToScreen = useCallback((e) => {
    if (e) e.stopPropagation();
    if (!svgRef.current || !zoomBehaviorRef.current || simNodes.length === 0) return;
    const padding = 40;
    const minX = d3.min(simNodes, n => n.x) || 0;
    const maxX = d3.max(simNodes, n => n.x) || 0;
    const minY = d3.min(simNodes, n => n.y) || 0;
    const maxY = d3.max(simNodes, n => n.y) || 0;

    const width = maxX - minX;
    const height = maxY - minY;
    
    if (width === 0 || height === 0) return;

    const scale = Math.max(0.1, Math.min(6, 0.9 / Math.max(width / w, height / h)));
    const transform = d3.zoomIdentity
      .translate(w / 2, h / 2)
      .scale(scale)
      .translate(-(minX + width / 2), -(minY + height / 2));

    zoomBehaviorRef.current.transform(d3.select(svgRef.current), transform);
  }, [simNodes, w, h]);

  const handleCenter = useCallback((e) => {
    if (e) e.stopPropagation();
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const transform = d3.zoomIdentity.translate(w / 2, h / 2).scale(1).translate(-w / 2, -h / 2);
    zoomBehaviorRef.current.transform(d3.select(svgRef.current), transform);
  }, [w, h]);

  const toggleNodeType = useCallback((type: NodeType) => {
    setHiddenNodeTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  // Drag handlers
  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, node: SimNode) => {
      e.stopPropagation();
      const sim = simulationRef.current;
      if (!sim) return;

      sim.alphaTarget(0.3).restart();
      node.fx = node.x;
      node.fy = node.y;
      setDraggedNode(node.id);
    },
    []
  );

  const handleDrag = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!draggedNode || !simulationRef.current) return;
      const node = simulationRef.current.nodes().find((n) => n.id === draggedNode);
      if (!node) return;

      const svg = svgRef.current;
      if (!svg) return;

      const point = svg.createSVGPoint();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      point.x = clientX;
      point.y = clientY;

      const t = transformRef.current;
      node.fx = (clientX - svg.getBoundingClientRect().left - t.x) / t.k;
      node.fy = (clientY - svg.getBoundingClientRect().top - t.y) / t.k;
    },
    [draggedNode]
  );

  const handleDragEnd = useCallback(() => {
    if (!draggedNode || !simulationRef.current) return;
    simulationRef.current.alphaTarget(0);
    const node = simulationRef.current.nodes().find((n) => n.id === draggedNode);
    if (node) {
      node.fx = null;
      node.fy = null;
    }
    setDraggedNode(null);
  }, [draggedNode]);

  useEffect(() => {
    if (draggedNode) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDrag);
      window.addEventListener('touchend', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDrag);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDrag);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [draggedNode, handleDrag, handleDragEnd]);

  // Attack path sets
  const attackNodeSet = useMemo(() => new Set(attackPath?.nodes ?? []), [attackPath]);
  const attackEdgeSet = useMemo(() => new Set(attackPath?.edges ?? []), [attackPath]);
  const isAttackMode = attackPath != null && (attackNodeSet.size > 0 || attackEdgeSet.size > 0);

  const handleNodeClick = useCallback(
    (e: React.MouseEvent, node: GraphNode) => {
      e.stopPropagation();
      setContextMenu(null);
      setSelectedNodeId(node.id);
      onNodeClick?.(node);
    },
    [onNodeClick]
  );

  const handleNodeContextMenu = useCallback(
    (e: React.MouseEvent, node: GraphNode) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = containerRef.current?.getBoundingClientRect();
      const x = e.clientX - (rect?.left ?? 0);
      const y = e.clientY - (rect?.top ?? 0);
      setContextMenu({ x, y, node });
    },
    []
  );

  const handleGraphClick = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleNodeHover = useCallback(
    (e: React.MouseEvent, node: GraphNode | null) => {
      if (node) {
        const rect = containerRef.current?.getBoundingClientRect();
        const x = e.clientX - (rect?.left ?? 0) + 12;
        const y = e.clientY - (rect?.top ?? 0) - 10;
        setTooltip({ x, y, node });
      } else {
        setTooltip(null);
      }
      onNodeHover?.(node);
    },
    [onNodeHover]
  );

  const edgeKey = useCallback((link: SimLink): string => {
    const s = typeof link.source === 'string' ? link.source : link.source.id;
    const t = typeof link.target === 'string' ? link.target : link.target.id;
    return `${s}->${t}`;
  }, []);

  const isEdgeInPath = useCallback(
    (link: SimLink): boolean => {
      if (!isAttackMode) return false;
      const key = edgeKey(link);
      if (attackEdgeSet.has(key)) return true;
      if (link.isAttackPath) return true;
      const s = typeof link.source === 'string' ? link.source : link.source.id;
      const t = typeof link.target === 'string' ? link.target : link.target.id;
      return attackEdgeSet.has(`${t}->${s}`);
    },
    [isAttackMode, attackEdgeSet, edgeKey]
  );

  // Render nodes
  const renderNode = useCallback(
    (node: SimNode) => {
      const style = getNodeStyle(node);
      const inPath = attackNodeSet.has(node.id);
      const dimmed = isAttackMode && !inPath;
      const isSelected = selectedNodeId === node.id;
      const isNewNode = node.isNew;

      const opacity = dimmed ? 0.12 : 1;
      const filter = isAttackMode && inPath ? 'url(#attackGlow)' : isSelected ? 'url(#glow)' : undefined;

      const groupProps = {
        key: node.id,
        transform: `translate(${node.x},${node.y})`,
        opacity,
        style: { cursor: 'grab', transition: 'opacity 0.5s ease' } as React.CSSProperties,
        onMouseDown: (e: React.MouseEvent) => handleDragStart(e, node),
        onClick: (e: React.MouseEvent) => handleNodeClick(e, node),
        onContextMenu: (e: React.MouseEvent) => handleNodeContextMenu(e, node),
        onMouseEnter: (e: React.MouseEvent) => handleNodeHover(e, node),
        onMouseLeave: (e: React.MouseEvent) => handleNodeHover(e, null),
      };

      const shapeElements: React.ReactNode[] = [];

      if (style.shape === 'crosshair-circle') {
        shapeElements.push(
          <circle key="body" r={style.radius} fill={style.color} fillOpacity={0.8} stroke={style.color} strokeWidth={2} filter={filter} />,
          <line key="h" x1={-style.radius * 0.6} x2={style.radius * 0.6} y1={0} y2={0} stroke="rgba(255,255,255,0.6)" strokeWidth={1} />,
          <line key="v" x1={0} x2={0} y1={-style.radius * 0.6} y2={style.radius * 0.6} stroke="rgba(255,255,255,0.6)" strokeWidth={1} />,
          <circle key="outer" r={style.radius + 3} fill="none" stroke={style.color} strokeWidth={1} strokeOpacity={0.4} />
        );
      } else if (style.shape === 'circle' || style.shape === 'small-circle') {
        shapeElements.push(
          <circle key="body" r={style.radius} fill={style.color} fillOpacity={0.8} stroke={style.color} strokeWidth={1.5} filter={filter} />
        );
      } else {
        const path = getShapePath(style.shape, style.radius);
        if (path) {
          shapeElements.push(
            <path key="body" d={path} fill={style.color} fillOpacity={0.8} stroke={style.color} strokeWidth={1.5} filter={filter} />
          );
        }
      }

      const showLabel =
        node.type === 'ThreatActor' ||
        node.type === 'Organization' ||
        node.type === 'Campaign' ||
        isSelected ||
        (!isAttackMode && (node.type === 'Malware' || node.type === 'Software'));

      if (showLabel && !dimmed) {
        shapeElements.push(
          <text
            key="label"
            y={style.radius + 14}
            textAnchor="middle"
            fill="#e2e8f0"
            fontSize={10}
            fontFamily="var(--font-sans), sans-serif"
            fontWeight={500}
            style={{ pointerEvents: 'none', textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5)' }}
          >
            {truncate(node.name, 14)}
          </text>
        );
      }

      return (
        <g {...groupProps} className={isNewNode ? 'animate-node-enter' : undefined}>
          {shapeElements}
        </g>
      );
    },
    [attackNodeSet, isAttackMode, selectedNodeId, handleDragStart, handleNodeClick, handleNodeHover]
  );

  // Render edges
  const renderEdge = useCallback(
    (link: SimLink) => {
      const src = link.source as SimNode;
      const tgt = link.target as SimNode;
      if (!src.x || !tgt.x) return null;

      const inPath = isEdgeInPath(link);
      const dimmed = isAttackMode && !inPath;

      if (inPath) {
        return (
          <line
            key={link.id}
            x1={src.x}
            y1={src.y}
            x2={tgt.x}
            y2={tgt.y}
            className="attack-path-edge"
            style={{ transition: 'opacity 0.5s ease' }}
          />
        );
      }

      return (
        <line
          key={link.id}
          x1={src.x}
          y1={src.y}
          x2={tgt.x}
          y2={tgt.y}
          stroke="rgba(255, 255, 255, 0.06)"
          strokeWidth={1}
          strokeOpacity={dimmed ? 0.03 : 1}
          className={dimmed ? '' : 'animate-flow'}
          style={{ transition: 'opacity 0.5s ease, stroke-opacity 0.5s ease' }}
        />
      );
    },
    [isAttackMode, isEdgeInPath]
  );

  const tooltipInfo = tooltip ? getTooltipContent(tooltip.node) : null;
  const tooltipStyle = tooltip ? getNodeStyle(tooltip.node) : null;

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden" style={{ background: '#0A0E17' }} onClick={handleGraphClick} onContextMenu={e => e.preventDefault()}>
      <svg
        ref={svgRef}
        width={w}
        height={h}
        className="w-full h-full"
        style={{ display: 'block' }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="attackGlow">
            <feGaussianBlur stdDeviation="6" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Subtle radial gradient background */}
          <radialGradient id="bgGrad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="rgba(239, 68, 68, 0.03)" />
            <stop offset="100%" stopColor="rgba(6, 10, 19, 0)" />
          </radialGradient>
        </defs>
        {/* Background gradient */}
        <rect width={w} height={h} fill="url(#bgGrad)" />
        <g transform={transform.toString()}>
          <g>{simLinks.map(renderEdge)}</g>
          <g>{simNodes.map(renderNode)}</g>
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && tooltipInfo && tooltipStyle && !contextMenu && (
        <div
          className="absolute pointer-events-none z-50 max-w-[220px]"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            background: 'rgba(10, 14, 23, 0.9)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '10px',
            padding: '8px 12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: tooltipStyle.color, boxShadow: `0 0 6px ${tooltipStyle.color}60` }}
            />
            <span className="text-[9px] font-mono uppercase tracking-[0.1em]" style={{ color: tooltipStyle.color }}>
              {tooltipInfo.type}
            </span>
          </div>
          <div className="text-[13px] font-semibold text-[#e2e8f0] mb-1">{tooltipInfo.name}</div>
          {tooltipInfo.details.map((d, i) => (
            <div key={i} className="text-[11px] text-[#64748b]">
              {d}
            </div>
          ))}
          <div className="text-[9px] text-[#334155] mt-1.5 italic">Click to expand</div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="absolute z-[60] w-48 rounded-lg overflow-hidden shadow-2xl flex flex-col"
          style={{
            left: contextMenu.x + 10,
            top: contextMenu.y + 10,
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b border-white/[0.05] bg-white/[0.02]">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{contextMenu.node.type}</div>
            <div className="text-xs font-medium text-slate-200 truncate" title={contextMenu.node.name}>{contextMenu.node.name}</div>
          </div>
          <div className="flex flex-col py-1">
            <button
              onClick={() => {
                onNodeClick?.(contextMenu.node);
                setContextMenu(null);
              }}
              className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors text-left"
            >
              <Info className="h-3.5 w-3.5 text-blue-400" />
              View Details
            </button>
            <button
              onClick={() => {
                // In a real app, this would trigger a deep dive or specialized view
                setContextMenu(null);
              }}
              className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors text-left"
            >
              <Search className="h-3.5 w-3.5 text-amber-400" />
              Investigate
            </button>
            {contextMenu.node.type === 'ThreatActor' && (
              <button
                onClick={() => {
                  // Simulate trigger attack path to a random target
                  onNodeClick?.(contextMenu.node);
                  setContextMenu(null);
                }}
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors text-left"
              >
                <Target className="h-3.5 w-3.5 text-red-400" />
                Find Attack Path
              </button>
            )}
            {contextMenu.node.type === 'Vulnerability' && (
              <button
                onClick={() => {
                  setContextMenu(null);
                }}
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors text-left"
              >
                <ShieldAlert className="h-3.5 w-3.5 text-orange-400" />
                Find Exploits
              </button>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      {!isAttackMode && nodes.length > 0 && (
        <div
          className="absolute bottom-3 left-3 p-2.5 text-[10px] pointer-events-auto select-none"
          style={{
            background: 'rgba(10, 14, 23, 0.8)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.04)',
            borderRadius: '10px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div className="font-semibold text-slate-300 mb-2 px-1 text-[9px] uppercase tracking-widest opacity-80">Entity Types</div>
          {(['ThreatActor', 'Vulnerability', 'Exploit', 'Software', 'Organization', 'Malware', 'Campaign', 'AttackTechnique'] as NodeType[]).map((type) => {
            const style = getNodeStyle({ id: '', type, name: '' });
            const isHidden = hiddenNodeTypes.has(type);
            return (
              <div 
                key={type} 
                className={`flex items-center gap-2 mb-1.5 last:mb-0 cursor-pointer hover:bg-white/[0.05] p-1 rounded transition-colors ${isHidden ? 'opacity-40' : ''}`}
                onClick={() => toggleNodeType(type)}
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: style.color, boxShadow: `0 0 6px ${style.color}60` }}
                />
                <span className={`text-[#94a3b8] ${isHidden ? 'line-through decoration-slate-600' : ''}`}>{type}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-[#475569] text-xs mb-3 font-mono">Loading threat graph...</div>
            <div className="w-8 h-8 border-2 border-[rgba(255,255,255,0.06)] border-t-[#ff3b3b] rounded-full animate-spin mx-auto" />
          </div>
        </div>
      )}

      {/* Graph Controls */}
      <div className="absolute top-3 left-3 z-30 flex flex-col gap-1 pointer-events-auto">
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white border border-white/[0.05] transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white border border-white/[0.05] transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={handleFitToScreen}
          className="p-1.5 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white border border-white/[0.05] transition-colors"
          title="Fit to Content"
        >
          <Maximize className="h-4 w-4" />
        </button>
        <button
          onClick={handleCenter}
          className="p-1.5 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white border border-white/[0.05] transition-colors"
          title="Center Canvas"
        >
          <Target className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
