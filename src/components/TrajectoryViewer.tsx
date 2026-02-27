"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, ArrowDown, FileText, Loader2, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TrajectoryStep } from "@/lib/types";

interface TrajectoryViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string | null;
}

export default function TrajectoryViewer({
  open,
  onOpenChange,
  taskId,
}: TrajectoryViewerProps) {
  const [steps, setSteps] = useState<TrajectoryStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !taskId) return;

    async function fetchTrajectory() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/browse/trajectory?taskId=${encodeURIComponent(taskId!)}`
        );
        if (!res.ok) throw new Error(`Failed to load trajectory (${res.status})`);
        const data = await res.json();
        setSteps(data.trajectory || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTrajectory();
  }, [open, taskId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[80vh]"
        style={{
          background: "rgba(10, 18, 32, 0.95)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.02)",
          color: "#e2e8f0",
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-[#e2e8f0] flex items-center gap-2">
            <Globe className="h-5 w-5 text-[#54a0ff]" />
            Browsing Investigation Trajectory
          </DialogTitle>
          <DialogDescription className="text-[#475569]">
            Step-by-step path of the autonomous browsing agent
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#475569]">
              <Loader2 className="h-6 w-6 animate-spin mb-2" />
              <span className="text-xs font-mono">Loading trajectory...</span>
            </div>
          ) : error ? (
            <div
              className="rounded-lg p-4 mx-4"
              style={{
                background: "rgba(255, 59, 59, 0.05)",
                border: "1px solid rgba(255, 59, 59, 0.12)",
              }}
            >
              <p className="text-sm text-[#ff3b3b]">{error}</p>
            </div>
          ) : steps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#334155]">
              <Globe className="h-8 w-8 mb-2 opacity-50" />
              <span className="text-xs">No trajectory data available</span>
            </div>
          ) : (
            <div className="relative pl-8 pr-4 py-2">
              {/* Vertical connecting line */}
              <div
                className="absolute left-[19px] top-4 bottom-4 w-px"
                style={{ background: "rgba(255, 255, 255, 0.06)" }}
              />

              <AnimatePresence>
                {steps.map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="relative mb-6 last:mb-0"
                  >
                    {/* Step number circle */}
                    <div
                      className="absolute -left-8 top-0 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{
                        background: "rgba(10, 18, 32, 0.9)",
                        border: "2px solid rgba(84, 160, 255, 0.4)",
                      }}
                    >
                      <span className="text-[10px] font-mono font-bold text-[#54a0ff]">
                        {i + 1}
                      </span>
                    </div>

                    <div
                      className="rounded-lg p-3 space-y-2"
                      style={{
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid rgba(255, 255, 255, 0.04)",
                      }}
                    >
                      {/* URL badge */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="inline-flex items-center text-[10px] text-[#54a0ff] font-mono max-w-full truncate px-1.5 py-0.5 rounded"
                          style={{
                            background: "rgba(84, 160, 255, 0.06)",
                            border: "1px solid rgba(84, 160, 255, 0.15)",
                          }}
                        >
                          <Globe className="h-3 w-3 mr-1 shrink-0" />
                          {step.url}
                        </span>
                      </div>

                      {/* Action description */}
                      <p className="text-[11px] text-[#94a3b8]">{step.action}</p>

                      {/* Extracted data */}
                      {step.data_extracted && (
                        <div
                          className="rounded-md p-2"
                          style={{
                            background: "rgba(46, 213, 115, 0.03)",
                            border: "1px solid rgba(46, 213, 115, 0.1)",
                          }}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <FileText className="h-3 w-3 text-[#2ed573]" />
                            <span className="text-[9px] text-[#2ed573] uppercase tracking-[0.1em] font-semibold">
                              Extracted Data
                            </span>
                          </div>
                          <p className="text-[10px] text-[#64748b] font-mono whitespace-pre-wrap">
                            {step.data_extracted}
                          </p>
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className="flex items-center gap-1 text-[9px] text-[#334155] font-mono">
                        <Clock className="h-3 w-3" />
                        {new Date(step.timestamp).toLocaleTimeString()}
                      </div>
                    </div>

                    {/* Arrow between steps */}
                    {i < steps.length - 1 && (
                      <div className="flex justify-center py-1">
                        <ArrowDown className="h-3 w-3 text-[#1e293b]" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
