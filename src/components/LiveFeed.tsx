"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Twitter,
  Github,
  Newspaper,
  Radio,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { FeedItem } from "@/lib/types";

const severityColors: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
  info: "bg-gray-500",
};

const severityBadgeStyles: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/40",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/40",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  low: "bg-green-500/20 text-green-400 border-green-500/40",
  info: "bg-gray-500/20 text-gray-400 border-gray-500/40",
};

const sourceIcons: Record<string, React.ComponentType<{ className?: string }>> =
  {
    nvd: Shield,
    twitter: Twitter,
    github: Github,
    news: Newspaper,
    system: Radio,
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
      className="border-b border-gray-800 last:border-b-0"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-3 py-2.5 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-start gap-2.5">
          {/* Severity dot */}
          <span
            className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
              severityColors[item.severity]
            }`}
          />

          <div className="flex-1 min-w-0">
            {/* Top row: source icon, title, time */}
            <div className="flex items-center gap-2">
              <SourceIcon className="h-3.5 w-3.5 text-gray-500 shrink-0" />
              <span className="text-sm font-medium text-gray-200 truncate flex-1">
                {item.title}
              </span>
              <span className="text-[10px] text-gray-600 font-mono shrink-0">
                {timeAgo(item.timestamp)}
              </span>
            </div>

            {/* Description preview */}
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
              {item.description}
            </p>
          </div>

          <ChevronDown
            className={`h-3.5 w-3.5 text-gray-600 shrink-0 mt-1 transition-transform ${
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
            <div className="px-3 pb-3 pl-8 space-y-2">
              <p className="text-xs text-gray-400">{item.description}</p>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  className={`text-[10px] border ${
                    severityBadgeStyles[item.severity]
                  }`}
                >
                  {item.severity.toUpperCase()}
                </Badge>

                {item.entities?.map((entity, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-[10px] text-gray-400 border-gray-700"
                  >
                    {entity.type}: {entity.name}
                  </Badge>
                ))}
              </div>

              {item.sourceUrl && (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Source
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
    <Card className="h-full flex flex-col bg-gray-900/50 border-gray-800 py-0 gap-0">
      <CardHeader className="px-3 py-2.5 border-b border-gray-800 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <Radio className="h-4 w-4 text-green-400" />
            Live Feed
          </CardTitle>
          <span className="text-[10px] text-gray-600 font-mono">
            {items.length} items
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <Radio className="h-8 w-8 mb-2 animate-pulse" />
            <span className="text-sm">Awaiting scout updates...</span>
            <div className="animate-typing mt-2 flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-600" />
              <span className="h-1.5 w-1.5 rounded-full bg-gray-600" />
              <span className="h-1.5 w-1.5 rounded-full bg-gray-600" />
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
      </CardContent>
    </Card>
  );
}
