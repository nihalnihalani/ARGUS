"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  ShieldAlert,
  Camera,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import type { VisualAnalysis } from "@/lib/types";

interface VisionAnalysisProps {
  analysis: VisualAnalysis | null;
  isLoading?: boolean;
  onAnalyze?: (imageUrl: string) => void;
}

const riskLevelStyles: Record<
  string,
  { color: string; bg: string; border: string }
> = {
  critical: {
    color: "#ff3b3b",
    bg: "rgba(255, 59, 59, 0.12)",
    border: "rgba(255, 59, 59, 0.25)",
  },
  high: {
    color: "#ff8c42",
    bg: "rgba(255, 140, 66, 0.12)",
    border: "rgba(255, 140, 66, 0.25)",
  },
  medium: {
    color: "#ffa502",
    bg: "rgba(255, 165, 2, 0.12)",
    border: "rgba(255, 165, 2, 0.25)",
  },
  low: {
    color: "#2ed573",
    bg: "rgba(46, 213, 115, 0.12)",
    border: "rgba(46, 213, 115, 0.25)",
  },
  none: {
    color: "#64748b",
    bg: "rgba(100, 116, 139, 0.12)",
    border: "rgba(100, 116, 139, 0.25)",
  },
};

function RiskBadge({ level }: { level: string }) {
  const style = riskLevelStyles[level] || riskLevelStyles.none;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-widest border"
      style={{
        color: style.color,
        background: style.bg,
        borderColor: style.border,
        boxShadow: `0 0 12px ${style.color}20`,
      }}
    >
      <ShieldAlert className="h-3 w-3" />
      {level}
    </span>
  );
}

function ConfidenceMeter({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 80 ? "#ff3b3b" : pct >= 60 ? "#ffa502" : pct >= 40 ? "#54a0ff" : "#2ed573";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#94a3b8] uppercase tracking-wider">
          Confidence
        </span>
        <span className="text-sm font-mono font-bold" style={{ color }}>
          {pct}%
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: "rgba(255, 255, 255, 0.04)" }}
      >
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            background: color,
            boxShadow: `0 0 10px ${color}60`,
          }}
        />
      </div>
    </div>
  );
}

function SkeletonAnalysis() {
  return (
    <div className="space-y-4 p-3">
      <div className="flex gap-3">
        <div className="h-20 w-28 rounded-lg tg-shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-5 rounded w-1/3 tg-shimmer" />
          <div className="h-3 rounded w-2/3 tg-shimmer" />
          <div className="h-3 rounded w-1/2 tg-shimmer" />
        </div>
      </div>
      <div className="h-3 rounded w-full tg-shimmer" />
      <div className="h-3 rounded w-4/5 tg-shimmer" />
      <div className="flex gap-2">
        <div className="h-5 rounded w-20 tg-shimmer" />
        <div className="h-5 rounded w-24 tg-shimmer" />
      </div>
    </div>
  );
}

export default function VisionAnalysis({
  analysis,
  isLoading,
  onAnalyze,
}: VisionAnalysisProps) {
  const [imageUrl, setImageUrl] = useState("");

  return (
    <div className="tg-panel flex flex-col">
      <div className="tg-panel-header shrink-0">
        <h3>
          <Eye className="h-3.5 w-3.5 text-[#c56cf0]" />
          Vision Analysis
        </h3>
        <span className="tg-meta">Reka</span>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-3 space-y-3">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <SkeletonAnalysis />
              </motion.div>
            ) : !analysis ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-10 text-[#334155]"
              >
                <Camera className="h-8 w-8 mb-2 opacity-50" />
                <span className="text-xs">No analysis available</span>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-3"
              >
                {/* Screenshot thumbnail + risk level */}
                <div className="flex gap-3">
                  <div
                    className="shrink-0 rounded-lg overflow-hidden"
                    style={{
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      maxWidth: 200,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={analysis.imageUrl}
                      alt="Analyzed screenshot"
                      className="block w-full h-auto rounded-lg object-cover"
                      style={{ maxWidth: 200 }}
                    />
                  </div>

                  <div className="flex-1 space-y-2.5 min-w-0">
                    <RiskBadge level={analysis.riskLevel} />
                    <ConfidenceMeter confidence={analysis.confidence} />

                    {/* Analysis type badge */}
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono border"
                      style={{
                        color: "#c56cf0",
                        background: "rgba(197, 108, 240, 0.06)",
                        borderColor: "rgba(197, 108, 240, 0.15)",
                      }}
                    >
                      {analysis.analysisType}
                    </span>
                  </div>
                </div>

                {/* Phishing indicator */}
                {analysis.isPhishing && (
                  <div
                    className="rounded-lg p-2.5 flex items-center gap-2"
                    style={{
                      background: "rgba(255, 59, 59, 0.05)",
                      border: "1px solid rgba(255, 59, 59, 0.15)",
                    }}
                  >
                    <AlertTriangle className="h-4 w-4 text-[#ff3b3b] shrink-0" />
                    <span className="text-[11px] font-semibold text-[#ff3b3b]">
                      Phishing Detected
                    </span>
                  </div>
                )}

                {/* Indicators */}
                {analysis.indicators.length > 0 && (
                  <div
                    className="rounded-lg p-3 space-y-2"
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.04)",
                    }}
                  >
                    <h4 className="text-[10px] text-[#94a3b8] uppercase tracking-widest font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-[#ffa502]" />
                      Indicators
                    </h4>
                    <ul className="space-y-1.5">
                      {analysis.indicators.map((indicator, i) => (
                        <li
                          key={i}
                          className="text-xs text-[#94a3b8] flex items-start gap-2 leading-relaxed"
                        >
                          <span className="text-[#ffa502] mt-0.5 shrink-0 text-[10px]">
                            {"\u25CF"}
                          </span>
                          {indicator}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Entities found */}
                {analysis.entitiesFound.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] text-[#94a3b8] uppercase tracking-widest font-semibold flex items-center gap-1.5">
                      <CheckCircle className="h-3 w-3 text-[#2ed573]" />
                      Entities Found
                    </h4>
                    <div className="flex gap-1.5 flex-wrap">
                      {analysis.entitiesFound.map((entity, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium text-[#e2e8f0] border border-white/[0.08] bg-white/[0.04]"
                        >
                          <span className="text-[#64748b] mr-1">
                            {entity.type}:
                          </span>
                          {entity.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary */}
                {analysis.summary && (
                  <div
                    className="rounded-lg p-3"
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.04)",
                    }}
                  >
                    <h4 className="text-[10px] text-[#94a3b8] uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1.5">
                      <Eye className="h-3 w-3 text-[#c56cf0]" />
                      Summary
                    </h4>
                    <p className="text-xs text-[#94a3b8] leading-relaxed">
                      {analysis.summary}
                    </p>
                  </div>
                )}

                {/* Model info */}
                <div className="text-[9px] font-mono text-[#334155] text-right">
                  Model: {analysis.model}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Input section */}
      {onAnalyze && (
        <div className="p-3 border-t border-white/[0.04] bg-white/[0.01] shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Image URL to analyze..."
              className="flex-1 rounded-lg px-3 py-2 text-xs text-[#e2e8f0] placeholder:text-[#334155] font-mono focus:outline-none focus:ring-1 focus:ring-[#c56cf0]/40 min-w-0"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && imageUrl.trim()) {
                  onAnalyze(imageUrl.trim());
                }
              }}
            />
            <button
              onClick={() => {
                if (imageUrl.trim()) {
                  onAnalyze(imageUrl.trim());
                }
              }}
              disabled={!imageUrl.trim() || isLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: imageUrl.trim()
                  ? "rgba(197, 108, 240, 0.15)"
                  : "rgba(255, 255, 255, 0.03)",
                border: `1px solid ${imageUrl.trim() ? "rgba(197, 108, 240, 0.3)" : "rgba(255, 255, 255, 0.06)"}`,
                color: imageUrl.trim() ? "#c56cf0" : "#475569",
                boxShadow: imageUrl.trim()
                  ? "0 0 16px rgba(197, 108, 240, 0.1)"
                  : "none",
              }}
            >
              <Camera className="h-3.5 w-3.5" />
              Analyze
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
