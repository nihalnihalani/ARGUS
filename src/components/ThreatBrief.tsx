"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  ShieldAlert,
  Scan,
  Download,
  FileText,
  Terminal
} from "lucide-react";
import { IconShieldBolt } from "@tabler/icons-react";
import ReactMarkdown from "react-markdown";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ThreatBrief as ThreatBriefType } from "@/lib/types";

const threatLevelColors: Record<string, string> = {
  critical: "bg-[rgba(255,59,59,0.12)] text-[#ff3b3b] border-[rgba(255,59,59,0.25)]",
  high: "bg-[rgba(255,140,66,0.12)] text-[#ff8c42] border-[rgba(255,140,66,0.25)]",
  elevated: "bg-[rgba(255,212,59,0.12)] text-[#ffd43b] border-[rgba(255,212,59,0.25)]",
  moderate: "bg-[rgba(116,143,252,0.12)] text-[#748ffc] border-[rgba(116,143,252,0.25)]",
  low: "bg-[rgba(81,207,102,0.12)] text-[#51cf66] border-[rgba(81,207,102,0.25)]",
};

function getSeverityColor(severity: number): string {
  if (severity >= 9) return "#ff3b3b";
  if (severity >= 7) return "#ff8c42";
  if (severity >= 5) return "#ffd43b";
  return "#51cf66";
}

function SkeletonBrief() {
  return (
    <div className="space-y-4">
      <div className="h-6 rounded w-1/3 tg-shimmer" />
      <div className="h-4 rounded w-2/3 tg-shimmer" />
      <div className="space-y-2">
        <div className="h-3 rounded w-full tg-shimmer" />
        <div className="h-3 rounded w-5/6 tg-shimmer" />
        <div className="h-3 rounded w-4/6 tg-shimmer" />
      </div>
      <div className="space-y-2 pt-4">
        <div className="h-4 rounded w-1/4 tg-shimmer" />
        <div className="h-8 rounded w-full tg-shimmer" />
        <div className="h-8 rounded w-full tg-shimmer" />
      </div>
    </div>
  );
}

interface ThreatBriefProps {
  brief: ThreatBriefType | null;
  isLoading?: boolean;
}

type TabType = 'executive' | 'technical';

export default function ThreatBrief({ brief, isLoading }: ThreatBriefProps) {
  const [activeTab, setActiveTab] = useState<TabType>('executive');

  return (
    <div className="tg-panel h-full flex flex-col">
      <div className="tg-panel-header shrink-0 flex items-center justify-between">
        <h3>
          <Brain className="h-3.5 w-3.5 text-[#c56cf0]" />
          AI Threat Brief
        </h3>
        <button
          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.05] text-[10px] font-medium text-slate-300 transition-colors"
          title="Export to PDF"
          onClick={() => alert("Export PDF feature coming soon")}
        >
          <Download className="h-3 w-3" />
          Export PDF
        </button>
      </div>

      <div className="px-3 py-2 border-b border-white/[0.04] bg-white/[0.01] shrink-0 flex gap-2">
        <button
          onClick={() => setActiveTab('executive')}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-[11px] font-medium transition-colors ${
            activeTab === 'executive' 
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.1)]' 
              : 'text-slate-400 hover:bg-white/[0.04]'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Executive Summary
        </button>
        <button
          onClick={() => setActiveTab('technical')}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-[11px] font-medium transition-colors ${
            activeTab === 'technical' 
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]' 
              : 'text-slate-400 hover:bg-white/[0.04]'
          }`}
        >
          <Terminal className="h-3.5 w-3.5" />
          Technical Details
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-3 space-y-4">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <SkeletonBrief />
                </motion.div>
              ) : !brief ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-40 text-[#334155]"
                >
                  <Brain className="h-8 w-8 mb-2 opacity-50" />
                  <span className="text-xs">
                    Generating threat assessment...
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key="content"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  {/* Threat level + headline */}
                  <div className="space-y-2.5">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold uppercase tracking-widest border shadow-sm ${
                        threatLevelColors[brief.overall_threat_level] ||
                        threatLevelColors.moderate
                      }`}
                    >
                      {brief.overall_threat_level}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-100 leading-snug tracking-wide">
                      {brief.headline}
                    </h3>
                  </div>

                  {/* Tab Content */}
                  {activeTab === 'executive' ? (
                    <motion.div
                      key="executive"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-5"
                    >
                      {/* Executive summary */}
                      <div className="text-xs text-slate-400 leading-relaxed prose prose-invert prose-sm max-w-none [&_strong]:text-slate-200">
                        <ReactMarkdown>{brief.executive_summary}</ReactMarkdown>
                      </div>

                      {/* CISA Relevant */}
                      {brief.cisa_relevant && (
                        <div
                          className="tg-breathe rounded-xl p-3.5 bg-yellow-500/5 border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.05)]"
                        >
                          <div className="flex items-start gap-3">
                            <ShieldAlert className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                            <div>
                              <h4 className="text-[11px] font-bold text-yellow-500 mb-1.5 uppercase tracking-widest">
                                CISA Impact Analysis
                              </h4>
                              <p className="text-xs text-yellow-500/80 leading-relaxed font-medium">
                                {brief.cisa_relevant}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Recommended Actions */}
                      {brief.recommended_actions.length > 0 && (
                        <div className="space-y-2.5">
                          <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                            Recommended Actions
                          </h4>
                          <ul className="space-y-2">
                            {brief.recommended_actions.map((action, i) => (
                              <li
                                key={i}
                                className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed"
                              >
                                <span className="text-emerald-400 mt-0.5 shrink-0 text-[10px]">
                                  ●
                                </span>
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="technical"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="space-y-5"
                    >
                      {/* Top Threats */}
                      {brief.top_threats.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
                            Top Threats
                          </h4>
                          {brief.top_threats.map((threat, i) => (
                            <div
                              key={i}
                              className="rounded-xl p-3.5 space-y-2 bg-white/[0.02] border border-white/[0.04]"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-200">
                                  {threat.threat}
                                </span>
                                <span
                                  className="text-[11px] font-mono font-bold"
                                  style={{ color: getSeverityColor(threat.severity) }}
                                >
                                  {threat.severity}/10
                                </span>
                              </div>
                              {/* Severity bar */}
                              <div className="h-1.5 rounded-full overflow-hidden bg-white/[0.04]">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${(threat.severity / 10) * 100}%`,
                                    background: getSeverityColor(threat.severity),
                                    boxShadow: `0 0 10px ${getSeverityColor(threat.severity)}60`,
                                  }}
                                />
                              </div>
                              <div className="flex items-center gap-2 flex-wrap pt-1">
                                {threat.affected_sectors.map((sector, j) => (
                                  <span
                                    key={j}
                                    className="text-[10px] font-medium text-slate-400 px-2 py-0.5 rounded-md border border-white/[0.06] bg-white/[0.02]"
                                  >
                                    {sector}
                                  </span>
                                ))}
                              </div>
                              <p className="text-xs text-slate-400 leading-relaxed pt-1">
                                {threat.recommended_action}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Attack Paths */}
                      {brief.attack_paths_detected.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <ArrowRight className="h-3.5 w-3.5 text-red-500" />
                            Attack Paths Detected
                          </h4>
                          {brief.attack_paths_detected.map((path, i) => (
                            <div
                              key={i}
                              className="rounded-xl p-3.5 bg-red-500/5 border border-red-500/10"
                            >
                              <div className="flex items-center gap-2 text-xs flex-wrap">
                                <span className="text-red-400 font-semibold">
                                  {path.from_actor}
                                </span>
                                <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                                <span className="text-orange-400 font-mono text-[11px]">
                                  {path.through_vulnerability}
                                </span>
                                <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                                <span className="text-emerald-400 font-semibold">
                                  {path.to_target}
                                </span>
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 uppercase tracking-widest">
                                  Risk Score:
                                </span>
                                <span
                                  className="text-[11px] font-mono font-bold"
                                  style={{ color: getSeverityColor(path.risk_score) }}
                                >
                                  {path.risk_score}/10
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
