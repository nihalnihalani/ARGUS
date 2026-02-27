"use client";

import { useEffect, useRef } from "react";
import {
  CircuitBoard,
  GitBranch,
  Skull,
  Bug,
  Siren,
  Radar,
} from "lucide-react";
import type { GraphStats as GraphStatsType } from "@/lib/types";

function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prevValue = useRef(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const start = prevValue.current;
    const end = value;
    if (start === end) return;

    const duration = 600;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * eased);
      if (el) el.textContent = current.toLocaleString();
      if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
    prevValue.current = value;
  }, [value]);

  return (
    <span ref={ref} className="tg-stat-value">
      {value.toLocaleString()}
    </span>
  );
}

interface GraphStatsProps {
  stats: GraphStatsType;
}

export default function GraphStats({ stats }: GraphStatsProps) {
  const items = [
    {
      icon: CircuitBoard,
      label: "Nodes",
      value: stats.nodeCount,
      color: "#54a0ff",
    },
    {
      icon: GitBranch,
      label: "Edges",
      value: stats.edgeCount,
      color: "#64748b",
    },
    {
      icon: Skull,
      label: "Actors",
      value: stats.threatActorCount,
      color: "#ff4757",
    },
    {
      icon: Bug,
      label: "Vulns",
      value: stats.vulnerabilityCount,
      color: "#ff6348",
    },
    {
      icon: Siren,
      label: "Critical",
      value: stats.criticalCount,
      color: "#ff3b3b",
      glow: stats.criticalCount > 0,
    },
    {
      icon: Radar,
      label: "Scouts",
      value: stats.activeScouts,
      color: "#2ed573",
    },
  ];

  return (
    <div className="flex items-center gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className={`tg-stat ${
            item.glow ? "animate-pulse-glow" : ""
          }`}
        >
          <item.icon
            className="tg-stat-icon"
            style={{ color: item.color }}
          />
          <AnimatedNumber value={item.value} />
          <span style={{ color: "#64748b" }}>{item.label}</span>
        </div>
      ))}
      {stats.lastUpdate && (
        <span className="text-[9px] font-mono text-[#334155] ml-1">
          {stats.lastUpdate}
        </span>
      )}
    </div>
  );
}
