"use client";

import {
  RefreshCw,
  Zap,
  Home,
  ShieldAlert,
  Settings,
  Bell,
  Network,
  Globe2
} from "lucide-react";
import { ArgusLogo } from "@/components/ui/argus-logo";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";
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
  activeVisualizer: 'graph' | 'map';
  onVisualizerChange: (visualizer: 'graph' | 'map') => void;
}

export default function Header({
  stats,
  threatLevel,
  onRefresh,
  isRefreshing,
  isDemoMode,
  onToggleDemo,
  activeVisualizer,
  onVisualizerChange,
}: HeaderProps) {
  // Determine the selected index based on activeVisualizer.
  // The tabs array structure: [Dashboard, Alerts, Sep, Graph, Map, Sep, Demo, Refresh, Settings, Bell]
  // Graph is index 3, Map is index 4.
  const visualizerIndex = activeVisualizer === 'graph' ? 3 : 4;

  const handleTabChange = (index: number | null) => {
    if (index === null) return;
    
    switch (index) {
      case 3: // Threat Graph
        onVisualizerChange('graph');
        break;
      case 4: // Global Map
        onVisualizerChange('map');
        break;
      case 6: // Demo Mode
        if (onToggleDemo) onToggleDemo();
        break;
      case 7: // Refresh
        if (onRefresh && !isRefreshing) onRefresh();
        break;
      // You can add cases for Settings(8), Bell(9), Dashboard(0), Alerts(1) here later
    }
  };

  return (
    <header
      className="relative flex items-center justify-between px-6 py-3 z-[100] border-b border-indigo-500/10 bg-[#0b0914] backdrop-blur-xl shadow-md h-16 pointer-events-auto"
    >
      {/* Left: Logo + Context / Threat Level */}
      <div className="flex items-center gap-4 shrink-0 mr-auto">
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

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-md border bg-red-500/5 border-red-500/10">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
          </span>
          <span
            className="text-[10px] font-semibold text-red-400/80 tracking-widest uppercase font-mono"
          >
            CISA DOWN — Auto Watch
          </span>
        </div>
      </div>

      {/* Right: Unified Navigation & Controls */}
      <div className="flex items-center shrink-0 ml-auto pointer-events-auto z-50">
        <ExpandableTabs
          tabs={[
            { title: "Dashboard", icon: Home },
            { title: "Alerts", icon: ShieldAlert },
            { type: "separator" },
            { title: "Network", icon: Network },
            { title: "Global Map", icon: Globe2 },
            { type: "separator" },
            { title: isDemoMode ? "Live Data" : "Demo Mode", icon: Zap },
            { title: "Refresh", icon: RefreshCw },
            { title: "Settings", icon: Settings },
            { title: "Notifications", icon: Bell },
          ]}
          activeColor="text-fuchsia-400"
          className="bg-transparent border-none p-0 shadow-none"
          defaultSelected={visualizerIndex}
          onChange={handleTabChange}
        />
      </div>
    </header>
  );
}
