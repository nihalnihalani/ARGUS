"use client";

import { Shield, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import GraphStats from "@/components/GraphStats";
import type { GraphStats as GraphStatsType } from "@/lib/types";

const threatLevelColors: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/50",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/50",
  elevated: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  moderate: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  low: "bg-green-500/20 text-green-400 border-green-500/50",
};

interface HeaderProps {
  stats: GraphStatsType;
  threatLevel: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function Header({
  stats,
  threatLevel,
  onRefresh,
  isRefreshing,
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-gray-950/80 backdrop-blur-md border-b border-gray-800 z-50">
      {/* Left: Logo */}
      <div className="flex items-center gap-2.5 shrink-0">
        <Shield className="h-6 w-6 text-red-500" />
        <span className="text-lg font-bold tracking-tight text-gray-50">
          ThreatGraph
        </span>
      </div>

      {/* Center: CISA Banner */}
      <div className="flex items-center gap-3">
        <motion.div
          className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-red-500/10 border border-red-500/30"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <span className="text-xs font-mono font-semibold text-red-400 tracking-wider uppercase">
            CISA Monitoring Suspended — Automated Threat Watch Active
          </span>
        </motion.div>

        <Badge
          className={`text-[10px] font-mono uppercase border ${
            threatLevelColors[threatLevel] || threatLevelColors.moderate
          }`}
        >
          {threatLevel}
        </Badge>
      </div>

      {/* Right: Stats + Refresh */}
      <div className="flex items-center gap-3 shrink-0">
        <GraphStats stats={stats} />
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw
              className={`h-4 w-4 text-gray-400 ${
                isRefreshing ? "animate-spin" : ""
              }`}
            />
          </button>
        )}
      </div>
    </header>
  );
}
