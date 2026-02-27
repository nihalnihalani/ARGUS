"use client";

import { RefreshCw, Zap } from "lucide-react";
import { ArgusLogo } from "@/components/ui/argus-logo";
import GraphStats from "@/components/GraphStats";
import type { GraphStats as GraphStatsType } from "@/lib/types";

const threatLevelColors: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/40",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/40",
  elevated: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  moderate: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  low: "bg-green-500/20 text-green-400 border-green-500/40",
};

interface HeaderProps {
  stats: GraphStatsType;
  threatLevel: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isDemoMode?: boolean;
  onToggleDemo?: () => void;
}

export default function Header({
  stats,
  threatLevel,
  onRefresh,
  isRefreshing,
  isDemoMode,
  onToggleDemo,
}: HeaderProps) {
  return (
    <header
      className="relative flex items-center justify-between px-6 py-3 z-50 border-b border-white/[0.04] bg-[#060a13]/80 backdrop-blur-xl shadow-md"
    >
      {/* Left: Logo + Context / Threat Level */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <ArgusLogo size={22} animate />
            <div className="absolute inset-0 blur-md bg-red-500/15 rounded-full" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[15px] font-bold tracking-tight text-gray-50">
              ARGUS
            </span>
            <span className="text-[9px] font-mono text-[#475569] tracking-widest uppercase">
              v1.0
            </span>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-mono uppercase tracking-widest border shadow-sm ${
            threatLevelColors[threatLevel] || threatLevelColors.moderate
          }`}
        >
          <Zap className="h-3 w-3" />
          {threatLevel}
        </span>

        <div
          className="flex items-center gap-2 px-3 py-1 rounded-md border"
          style={{
            background: "rgba(239, 68, 68, 0.05)",
            borderColor: "rgba(239, 68, 68, 0.1)",
          }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
          </span>
          <span
            className="text-[10px] font-semibold text-red-400/80 tracking-widest uppercase"
            style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}
          >
            CISA DOWN — Auto Watch
          </span>
        </div>
      </div>

      {/* Center: Stats */}
      <GraphStats stats={stats} />

      {/* Right: Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {onToggleDemo && (
          <button
            onClick={onToggleDemo}
            className={`px-2.5 py-1 rounded-md text-[9px] font-mono uppercase tracking-[0.1em] border transition-all duration-200 ${
              isDemoMode
                ? "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.08)]"
                : "text-[#475569] border-[rgba(255,255,255,0.04)] hover:text-[#94a3b8] hover:border-[rgba(255,255,255,0.08)]"
            }`}
            style={{
              background: isDemoMode
                ? undefined
                : "rgba(255, 255, 255, 0.02)",
            }}
            title="Toggle demo mode"
          >
            DEMO
          </button>
        )}

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-md transition-all duration-200 disabled:opacity-40 hover:bg-white/[0.03]"
            style={{ border: "1px solid rgba(255, 255, 255, 0.04)" }}
            title="Refresh data"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-[#64748b] ${
                isRefreshing ? "animate-spin" : ""
              }`}
            />
          </button>
        )}
      </div>
    </header>
  );
}
