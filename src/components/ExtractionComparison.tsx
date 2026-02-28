"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Brain, Clock, Target, BarChart2, Loader2 } from "lucide-react";
import type { ExtractionComparison } from "@/lib/types";

interface ExtractionComparisonProps {
  data: ExtractionComparison | null;
  isLoading?: boolean;
  onRunComparison?: (text: string) => void;
}

function F1Badge({ score }: { score: number }) {
  const color =
    score >= 0.7 ? "#2ed573" : score >= 0.4 ? "#ffa502" : "#ff3b3b";
  const bgColor =
    score >= 0.7
      ? "rgba(46, 213, 115, 0.12)"
      : score >= 0.4
        ? "rgba(255, 165, 2, 0.12)"
        : "rgba(255, 59, 59, 0.12)";
  const borderColor =
    score >= 0.7
      ? "rgba(46, 213, 115, 0.25)"
      : score >= 0.4
        ? "rgba(255, 165, 2, 0.25)"
        : "rgba(255, 59, 59, 0.25)";

  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider border"
      style={{
        color,
        background: bgColor,
        borderColor,
        boxShadow: `0 0 12px ${color}20`,
      }}
    >
      F1: {score.toFixed(2)}
    </span>
  );
}

function MetricRow({
  icon: Icon,
  label,
  value,
  unit,
  color,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: number;
  unit?: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color, opacity: 0.7 }} />
      <span className="text-[10px] text-[#94a3b8] uppercase tracking-wider flex-1">
        {label}
      </span>
      <span className="text-sm font-mono font-semibold text-[#e2e8f0]">
        {value.toLocaleString()}
        {unit && (
          <span className="text-[10px] text-[#64748b] ml-0.5">{unit}</span>
        )}
      </span>
    </div>
  );
}

function ColumnCard({
  title,
  titleColor,
  icon: Icon,
  entityCount,
  iocCount,
  extractionTimeMs,
}: {
  title: string;
  titleColor: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  entityCount: number;
  iocCount: number;
  extractionTimeMs: number;
}) {
  return (
    <div
      className="flex-1 rounded-lg p-3 space-y-3"
      style={{
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.04)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4" style={{ color: titleColor }} />
        <h4
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: titleColor }}
        >
          {title}
        </h4>
      </div>

      <div className="space-y-2.5">
        <MetricRow
          icon={Target}
          label="Entities"
          value={entityCount}
          color={titleColor}
        />
        <MetricRow
          icon={BarChart2}
          label="IOCs"
          value={iocCount}
          color={titleColor}
        />
        <MetricRow
          icon={Clock}
          label="Time"
          value={extractionTimeMs}
          unit="ms"
          color={titleColor}
        />
      </div>
    </div>
  );
}

function SkeletonComparison() {
  return (
    <div className="space-y-4 p-3">
      <div className="flex gap-3">
        <div className="flex-1 space-y-3">
          <div className="h-4 rounded w-2/3 tg-shimmer" />
          <div className="h-3 rounded w-full tg-shimmer" />
          <div className="h-3 rounded w-full tg-shimmer" />
          <div className="h-3 rounded w-full tg-shimmer" />
        </div>
        <div className="flex-1 space-y-3">
          <div className="h-4 rounded w-2/3 tg-shimmer" />
          <div className="h-3 rounded w-full tg-shimmer" />
          <div className="h-3 rounded w-full tg-shimmer" />
          <div className="h-3 rounded w-full tg-shimmer" />
        </div>
      </div>
      <div className="h-8 rounded w-1/2 mx-auto tg-shimmer" />
    </div>
  );
}

export default function ExtractionComparisonWidget({
  data,
  isLoading,
  onRunComparison,
}: ExtractionComparisonProps) {
  const [inputText, setInputText] = useState("");

  return (
    <div className="tg-panel flex flex-col">
      <div className="tg-panel-header shrink-0">
        <h3>
          <BarChart2 className="h-3.5 w-3.5 text-[#54a0ff]" />
          Extraction Comparison
        </h3>
        <span className="tg-meta">GLiNER vs GPT-4o</span>
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
                <div className="flex flex-col items-center justify-center py-8 text-[#475569]">
                  <Loader2 className="h-6 w-6 animate-spin mb-2" />
                  <span className="text-xs font-mono">
                    Running extraction comparison...
                  </span>
                </div>
              </motion.div>
            ) : !data ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-10 text-[#334155]"
              >
                <BarChart2 className="h-8 w-8 mb-2 opacity-50" />
                <span className="text-xs">
                  Run a comparison to see results
                </span>
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
                {/* Side-by-side columns */}
                <div className="flex gap-2">
                  <ColumnCard
                    title="GLiNER (Fastino)"
                    titleColor="#2ed573"
                    icon={Zap}
                    entityCount={data.gliner.entityCount}
                    iocCount={data.gliner.iocCount}
                    extractionTimeMs={data.gliner.extractionTimeMs}
                  />
                  <ColumnCard
                    title="OpenAI GPT-4o"
                    titleColor="#54a0ff"
                    icon={Brain}
                    entityCount={data.openai.entityCount}
                    iocCount={data.openai.iocCount}
                    extractionTimeMs={data.openai.extractionTimeMs}
                  />
                </div>

                {/* Overlap / F1 section */}
                <div
                  className="rounded-lg p-3 space-y-2.5"
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target
                        className="h-3.5 w-3.5"
                        style={{ color: "#c56cf0", opacity: 0.7 }}
                      />
                      <span className="text-[10px] text-[#94a3b8] uppercase tracking-wider">
                        Overlap
                      </span>
                    </div>
                    <F1Badge score={data.overlap.f1Estimate} />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#64748b]">
                      Shared entities:
                    </span>
                    <span className="text-sm font-mono font-semibold text-[#e2e8f0]">
                      {data.overlap.sharedEntities.length}
                    </span>
                  </div>

                  {/* Breakdown pills */}
                  <div className="flex gap-2 flex-wrap">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono border"
                      style={{
                        color: "#2ed573",
                        background: "rgba(46, 213, 115, 0.06)",
                        borderColor: "rgba(46, 213, 115, 0.15)",
                      }}
                    >
                      GLiNER only: {data.overlap.glinerOnly.length}
                    </span>
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono border"
                      style={{
                        color: "#54a0ff",
                        background: "rgba(84, 160, 255, 0.06)",
                        borderColor: "rgba(84, 160, 255, 0.15)",
                      }}
                    >
                      OpenAI only: {data.overlap.openaiOnly.length}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Input section */}
      {onRunComparison && (
        <div className="p-3 border-t border-white/[0.04] bg-white/[0.01] shrink-0 space-y-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste threat intel text to compare extraction..."
            rows={3}
            className="w-full rounded-lg px-3 py-2 text-xs text-[#e2e8f0] placeholder:text-[#334155] font-mono resize-none focus:outline-none focus:ring-1 focus:ring-[#54a0ff]/40"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          />
          <button
            onClick={() => {
              if (inputText.trim()) {
                onRunComparison(inputText.trim());
              }
            }}
            disabled={!inputText.trim() || isLoading}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: inputText.trim()
                ? "rgba(84, 160, 255, 0.15)"
                : "rgba(255, 255, 255, 0.03)",
              border: `1px solid ${inputText.trim() ? "rgba(84, 160, 255, 0.3)" : "rgba(255, 255, 255, 0.06)"}`,
              color: inputText.trim() ? "#54a0ff" : "#475569",
              boxShadow: inputText.trim()
                ? "0 0 16px rgba(84, 160, 255, 0.1)"
                : "none",
            }}
          >
            <Zap className="h-3.5 w-3.5" />
            Run Comparison
          </button>
        </div>
      )}
    </div>
  );
}
