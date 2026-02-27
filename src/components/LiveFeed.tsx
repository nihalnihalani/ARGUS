"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Twitter,
  Github,
  Newspaper,
  Radio,
  Radar,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { IconShieldLock } from "@tabler/icons-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FeedItem } from "@/lib/types";

const severityBadgeStyles: Record<string, string> = {
  critical: "bg-[rgba(255,59,59,0.12)] text-[#ff3b3b] border-[rgba(255,59,59,0.25)]",
  high: "bg-[rgba(255,140,66,0.12)] text-[#ff8c42] border-[rgba(255,140,66,0.25)]",
  medium: "bg-[rgba(255,212,59,0.12)] text-[#ffd43b] border-[rgba(255,212,59,0.25)]",
  low: "bg-[rgba(81,207,102,0.12)] text-[#51cf66] border-[rgba(81,207,102,0.25)]",
  info: "bg-[rgba(116,143,252,0.12)] text-[#748ffc] border-[rgba(116,143,252,0.25)]",
};

const sourceIcons: Record<string, React.ComponentType<{ className?: string }>> =
  {
    nvd: IconShieldLock,
    twitter: Twitter,
    github: Github,
    news: Newspaper,
    system: Radar,
  };

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface FeedItemCardProps {
  item: FeedItem;
}

function FeedItemCard({ item }: FeedItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const SourceIcon = sourceIcons[item.source] || Radio;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3"
      >
        <div className="flex items-start gap-3">
          <span className={`tg-severity-dot mt-1.5 ${item.severity}`} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <SourceIcon className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="text-sm font-semibold text-slate-200 truncate flex-1">
                {item.title}
              </span>
              <span className="text-[10px] text-slate-500 font-mono shrink-0">
                {timeAgo(item.timestamp)}
              </span>
            </div>
            
            <p className="text-xs text-slate-400 line-clamp-1">
              {item.description}
            </p>
          </div>

          <ChevronDown
            className={`h-4 w-4 text-slate-500 shrink-0 mt-1 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pl-10 space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">{item.description}</p>
              
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${severityBadgeStyles[item.severity]}`}>
                  {item.severity}
                </span>

                {item.entities?.map((entity, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium text-slate-300 border border-white/[0.08] bg-white/[0.04]"
                  >
                    {entity.type}: {entity.name}
                  </span>
                ))}
              </div>

              {item.sourceUrl && (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors mt-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Source Analysis
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface LiveFeedProps {
  items: FeedItem[];
}

export default function LiveFeed({ items }: LiveFeedProps) {
  return (
    <div className="tg-panel h-full flex flex-col">
      <div className="tg-panel-header shrink-0">
        <h3>
          <span className="relative flex h-2 w-2 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2ed573] opacity-40" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2ed573]" />
          </span>
          Live Feed
        </h3>
        <span className="tg-meta">{items.length} items</span>
      </div>

      <div className="flex-1 overflow-hidden">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#334155]">
            <Radio className="h-8 w-8 mb-2 animate-pulse" />
            <span className="text-xs">Awaiting scout updates...</span>
            <div className="animate-typing mt-2 flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#334155]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#334155]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#334155]" />
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <AnimatePresence initial={false}>
              {items.slice(0, 50).map((item) => (
                <FeedItemCard key={item.id} item={item} />
              ))}
            </AnimatePresence>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
