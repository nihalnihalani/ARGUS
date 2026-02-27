"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  ShieldAlert,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ThreatBrief as ThreatBriefType } from "@/lib/types";

const threatLevelColors: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/50",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/50",
  elevated: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  moderate: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  low: "bg-green-500/20 text-green-400 border-green-500/50",
};

const severityBarColors: Record<number, string> = {
  10: "bg-red-500",
  9: "bg-red-500",
  8: "bg-orange-500",
  7: "bg-orange-500",
  6: "bg-yellow-500",
  5: "bg-yellow-500",
  4: "bg-green-500",
  3: "bg-green-500",
  2: "bg-blue-500",
  1: "bg-blue-500",
};

function getSeverityBarColor(severity: number): string {
  return severityBarColors[Math.round(severity)] || "bg-gray-500";
}

function SkeletonBrief() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 bg-gray-800 rounded w-1/3" />
      <div className="h-4 bg-gray-800 rounded w-2/3" />
      <div className="space-y-2">
        <div className="h-3 bg-gray-800 rounded w-full" />
        <div className="h-3 bg-gray-800 rounded w-5/6" />
        <div className="h-3 bg-gray-800 rounded w-4/6" />
      </div>
      <div className="space-y-2 pt-4">
        <div className="h-4 bg-gray-800 rounded w-1/4" />
        <div className="h-8 bg-gray-800 rounded w-full" />
        <div className="h-8 bg-gray-800 rounded w-full" />
      </div>
    </div>
  );
}

interface ThreatBriefProps {
  brief: ThreatBriefType | null;
  isLoading?: boolean;
}

export default function ThreatBrief({ brief, isLoading }: ThreatBriefProps) {
  return (
    <Card className="h-full flex flex-col bg-gray-900/50 border-gray-800 py-0 gap-0">
      <CardHeader className="px-3 py-2.5 border-b border-gray-800 shrink-0">
        <CardTitle className="text-sm font-semibold text-gray-200 flex items-center gap-2">
          <Brain className="h-4 w-4 text-purple-400" />
          AI Threat Brief
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
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
                  className="flex flex-col items-center justify-center h-40 text-gray-600"
                >
                  <Brain className="h-8 w-8 mb-2 opacity-50" />
                  <span className="text-sm">
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
                  className="space-y-4"
                >
                  {/* Threat level + headline */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`text-[10px] uppercase font-mono border ${
                          threatLevelColors[brief.overall_threat_level] ||
                          threatLevelColors.moderate
                        }`}
                      >
                        {brief.overall_threat_level}
                      </Badge>
                    </div>
                    <h3 className="text-sm font-bold text-gray-100">
                      {brief.headline}
                    </h3>
                  </div>

                  {/* Executive summary */}
                  <div className="text-xs text-gray-400 leading-relaxed prose prose-invert prose-xs max-w-none">
                    <ReactMarkdown>{brief.executive_summary}</ReactMarkdown>
                  </div>

                  {/* Top Threats */}
                  {brief.top_threats.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3 text-orange-400" />
                        Top Threats
                      </h4>
                      {brief.top_threats.map((threat, i) => (
                        <div
                          key={i}
                          className="bg-gray-800/50 rounded-md p-2.5 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-200">
                              {threat.threat}
                            </span>
                            <span className="text-[10px] font-mono text-gray-500">
                              {threat.severity}/10
                            </span>
                          </div>
                          {/* Severity bar */}
                          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${getSeverityBarColor(
                                threat.severity
                              )}`}
                              style={{
                                width: `${(threat.severity / 10) * 100}%`,
                              }}
                            />
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {threat.affected_sectors.map((sector, j) => (
                              <Badge
                                key={j}
                                variant="outline"
                                className="text-[9px] text-gray-500 border-gray-700 px-1.5 py-0"
                              >
                                {sector}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-[10px] text-gray-500">
                            {threat.recommended_action}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Attack Paths */}
                  {brief.attack_paths_detected.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                        <ArrowRight className="h-3 w-3 text-red-400" />
                        Attack Paths Detected
                      </h4>
                      {brief.attack_paths_detected.map((path, i) => (
                        <div
                          key={i}
                          className="bg-gray-800/50 rounded-md p-2.5"
                        >
                          <div className="flex items-center gap-1.5 text-xs flex-wrap">
                            <span className="text-red-400 font-medium">
                              {path.from_actor}
                            </span>
                            <ArrowRight className="h-3 w-3 text-gray-600" />
                            <span className="text-orange-400 font-mono">
                              {path.through_vulnerability}
                            </span>
                            <ArrowRight className="h-3 w-3 text-gray-600" />
                            <span className="text-green-400 font-medium">
                              {path.to_target}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-500">
                              Risk Score:
                            </span>
                            <span
                              className={`text-[10px] font-mono font-bold ${
                                path.risk_score >= 8
                                  ? "text-red-400"
                                  : path.risk_score >= 6
                                  ? "text-orange-400"
                                  : "text-yellow-400"
                              }`}
                            >
                              {path.risk_score}/10
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* CISA Relevant */}
                  {brief.cisa_relevant && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md p-2.5">
                      <div className="flex items-start gap-2">
                        <ShieldAlert className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-semibold text-yellow-400 mb-1">
                            CISA Impact
                          </h4>
                          <p className="text-[10px] text-yellow-300/70">
                            {brief.cisa_relevant}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recommended Actions */}
                  {brief.recommended_actions.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle className="h-3 w-3 text-green-400" />
                        Recommended Actions
                      </h4>
                      <ul className="space-y-1">
                        {brief.recommended_actions.map((action, i) => (
                          <li
                            key={i}
                            className="text-[10px] text-gray-400 flex items-start gap-1.5"
                          >
                            <span className="text-green-500 mt-0.5">
                              &#x2022;
                            </span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
