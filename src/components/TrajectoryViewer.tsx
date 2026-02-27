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
import { Badge } from "@/components/ui/badge";
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
        setSteps(data.steps || []);
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
      <DialogContent className="sm:max-w-2xl bg-gray-900 border-gray-700 max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-gray-100 flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-400" />
            Browsing Investigation Trajectory
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Step-by-step path of the autonomous browsing agent
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin mb-2" />
              <span className="text-sm">Loading trajectory...</span>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-md p-4 mx-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : steps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-600">
              <Globe className="h-8 w-8 mb-2 opacity-50" />
              <span className="text-sm">No trajectory data available</span>
            </div>
          ) : (
            <div className="relative pl-8 pr-4 py-2">
              {/* Vertical connecting line */}
              <div className="absolute left-[19px] top-4 bottom-4 w-px bg-gray-700" />

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
                    <div className="absolute -left-8 top-0 w-6 h-6 rounded-full bg-gray-800 border-2 border-blue-500/50 flex items-center justify-center">
                      <span className="text-[10px] font-mono font-bold text-blue-400">
                        {i + 1}
                      </span>
                    </div>

                    <div className="bg-gray-800/50 border border-gray-700 rounded-md p-3 space-y-2">
                      {/* URL badge */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-[10px] text-blue-400 border-blue-500/30 font-mono max-w-full truncate"
                        >
                          <Globe className="h-3 w-3 mr-1 shrink-0" />
                          {step.url}
                        </Badge>
                      </div>

                      {/* Action description */}
                      <p className="text-xs text-gray-300">{step.action}</p>

                      {/* Extracted data */}
                      {step.data_extracted && (
                        <div className="bg-gray-900/50 rounded p-2 border border-gray-700/50">
                          <div className="flex items-center gap-1 mb-1">
                            <FileText className="h-3 w-3 text-green-400" />
                            <span className="text-[10px] text-green-400 uppercase tracking-wider font-semibold">
                              Extracted Data
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 font-mono whitespace-pre-wrap">
                            {step.data_extracted}
                          </p>
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className="flex items-center gap-1 text-[10px] text-gray-600">
                        <Clock className="h-3 w-3" />
                        {new Date(step.timestamp).toLocaleTimeString()}
                      </div>
                    </div>

                    {/* Arrow between steps */}
                    {i < steps.length - 1 && (
                      <div className="flex justify-center py-1">
                        <ArrowDown className="h-3 w-3 text-gray-700" />
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
