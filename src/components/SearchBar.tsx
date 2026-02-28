"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Loader2,
  Globe,
  Route,
  Bug,
  X,
  Fingerprint,
  Target,
} from "lucide-react";
import { IconSpy, IconVirus } from "@tabler/icons-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { GraphNode, GraphEdge } from "@/lib/types";

type InputType = "cve" | "ip" | "domain" | "text";

function detectInputType(input: string): InputType {
  if (/^CVE-\d{4}-\d{4,}$/i.test(input.trim())) return "cve";
  if (
    /^(\d{1,3}\.){3}\d{1,3}$/.test(input.trim()) ||
    /^([0-9a-f]{1,4}:){2,7}[0-9a-f]{1,4}$/i.test(input.trim())
  )
    return "ip";
  if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(input.trim())) return "domain";
  return "text";
}

interface SearchResult {
  type: string;
  title: string;
  description: string;
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  taskId?: string;
}

interface SearchBarProps {
  onResults?: (nodes: GraphNode[], edges: GraphEdge[]) => void;
  onViewTrajectory?: (taskId: string) => void;
}

export default function SearchBar({
  onResults,
  onViewTrajectory,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) return;

      setIsLoading(true);
      setError(null);
      setResults([]);

      const inputType = detectInputType(searchQuery);

      // Track recent searches
      setRecentSearches((prev) => {
        const updated = [
          searchQuery,
          ...prev.filter((s) => s !== searchQuery),
        ].slice(0, 5);
        return updated;
      });

      try {
        let response: Response;

        switch (inputType) {
          case "cve":
            response = await fetch("/api/tavily/search", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                query: `${searchQuery} vulnerability exploit details`,
                domains: [
                  "nvd.nist.gov",
                  "cve.org",
                  "bleepingcomputer.com",
                ],
              }),
            });
            break;

          case "ip":
          case "domain":
            response = await fetch("/api/browse/investigate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ target: searchQuery }),
            });
            break;

          case "text":
          default:
            response = await fetch(`/api/graph/query?q=${encodeURIComponent(searchQuery)}`, {
              method: "GET",
            });
            break;
        }

        if (!response.ok) {
          throw new Error(`Search failed (${response.status})`);
        }

        const data = await response.json();

        const nodeCount = data.nodes?.length || 0;
        const edgeCount = data.edges?.length || 0;

        const searchResult: SearchResult = {
          type: inputType,
          title: `Results for "${searchQuery}"`,
          description:
            inputType === "cve"
              ? "Vulnerability intelligence gathered"
              : inputType === "ip" || inputType === "domain"
              ? "Network investigation initiated"
              : nodeCount > 0
              ? `Found ${nodeCount} entities and ${edgeCount} relationships — added to live graph`
              : "No matching entities found in the knowledge graph",
          nodes: data.nodes,
          edges: data.edges,
          taskId: data.investigation?.taskId ?? data.research?.taskId ?? data.taskId,
        };

        setResults([searchResult]);

        // Always push discovered nodes/edges to the live graph
        if (data.nodes?.length > 0 && data.edges && onResults) {
          onResults(data.nodes, data.edges);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setIsLoading(false);
      }
    },
    [onResults]
  );

  return (
    <div className="tg-panel h-full flex flex-col">
      <div className="tg-panel-header shrink-0">
        <h3>
          <Search className="h-3.5 w-3.5 text-[#54a0ff]" />
          Investigate
        </h3>
      </div>

      <div className="flex-1 p-3 overflow-hidden flex flex-col gap-3">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#334155]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch(query);
            }}
            placeholder="Search CVE, IP, domain... (Cmd+K)"
            className="w-full rounded-lg pl-9 pr-9 py-2 text-[13px] text-[#e2e8f0] placeholder:text-[#334155] focus:outline-none transition-all duration-200"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.2)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.3)";
              e.currentTarget.style.boxShadow = "inset 0 1px 2px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(59, 130, 246, 0.1)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)";
              e.currentTarget.style.boxShadow = "inset 0 1px 2px rgba(0, 0, 0, 0.2)";
            }}
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setResults([]);
                setError(null);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-3.5 w-3.5 text-[#475569] hover:text-[#94a3b8] transition-colors" />
            </button>
          )}
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: "Find Attack Path", icon: Route, query: "APT28" },
            { label: "Scan CVE", icon: Bug, query: "CVE-2026-1731" },
            { label: "WHOIS Lookup", icon: Globe, query: "8.8.8.8" },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => handleSearch(action.query)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-[#475569] hover:text-[#94a3b8] transition-all duration-200"
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.04)",
              }}
            >
              <action.icon className="h-3 w-3" />
              {action.label}
            </button>
          ))}
        </div>

        {/* Recent searches */}
        {recentSearches.length > 0 && results.length === 0 && !isLoading && (
          <div className="space-y-1">
            <span className="text-[9px] text-[#334155] uppercase tracking-[0.1em] font-semibold">
              Recent
            </span>
            <div className="flex flex-wrap gap-1.5">
              {recentSearches.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQuery(s);
                    handleSearch(s);
                  }}
                  className="px-2 py-0.5 rounded text-[10px] text-[#64748b] hover:text-[#e2e8f0] transition-colors"
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.04)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-8 text-[#475569]"
            >
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-xs font-mono">Investigating...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {error && (
          <div className="rounded-lg p-2.5"
            style={{
              background: "rgba(255, 59, 59, 0.05)",
              border: "1px solid rgba(255, 59, 59, 0.12)",
            }}
          >
            <p className="text-[11px] text-[#ff3b3b]">{error}</p>
          </div>
        )}

        {/* Results */}
        <ScrollArea className="flex-1">
          <AnimatePresence>
            {results.map((result, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-lg p-3 space-y-2"
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.04)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[#e2e8f0]">
                    {result.title}
                  </span>
                  <span className="text-[9px] font-mono text-[#475569] px-1.5 py-0 rounded border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)]">
                    {result.type}
                  </span>
                </div>
                <p className="text-[11px] text-[#64748b]">{result.description}</p>

                {result.nodes && (
                  <p className="text-[10px] text-[#475569] font-mono">
                    {result.nodes.length} nodes, {result.edges?.length || 0} edges
                  </p>
                )}

                {result.taskId && onViewTrajectory && (
                  <button
                    onClick={() => onViewTrajectory(result.taskId!)}
                    className="flex items-center gap-1 text-[10px] text-[#54a0ff] hover:text-[#748ffc] transition-colors"
                  >
                    <Route className="h-3 w-3" />
                    View Trajectory
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </ScrollArea>
      </div>
    </div>
  );
}
