"use client";

import { useEffect, useRef } from "react";
import {
  CircuitBoard,
  GitBranch,
  Skull,
  Bug,
  AlertTriangle,
  Radio,
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
    <span ref={ref} className="font-mono font-bold text-gray-50">
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
      color: "text-blue-400",
    },
    {
      icon: GitBranch,
      label: "Edges",
      value: stats.edgeCount,
      color: "text-gray-400",
    },
    {
      icon: Skull,
      label: "Actors",
      value: stats.threatActorCount,
      color: "text-red-400",
    },
    {
      icon: Bug,
      label: "Vulns",
      value: stats.vulnerabilityCount,
      color: "text-orange-400",
    },
    {
      icon: AlertTriangle,
      label: "Critical",
      value: stats.criticalCount,
      color: "text-red-500",
      glow: stats.criticalCount > 0,
    },
    {
      icon: Radio,
      label: "Scouts",
      value: stats.activeScouts,
      color: "text-green-400",
    },
  ];

  return (
    <div className="flex items-center gap-4 text-xs">
      {items.map((item) => (
        <div
          key={item.label}
          className={`flex items-center gap-1.5 ${
            item.glow ? "animate-pulse-glow rounded-md px-1.5 py-0.5" : ""
          }`}
        >
          <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
          <AnimatedNumber value={item.value} />
          <span className="text-gray-500">{item.label}</span>
        </div>
      ))}
      {stats.lastUpdate && (
        <span className="text-gray-600 font-mono text-[10px]">
          Updated {stats.lastUpdate}
        </span>
      )}
    </div>
  );
}
