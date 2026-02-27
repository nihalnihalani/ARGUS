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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
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
            response = await fetch("/api/graph/query", {
              method: "GET",
            });
            break;
        }

        if (!response.ok) {
          throw new Error(`Search failed (${response.status})`);
        }

        const data = await response.json();

        const searchResult: SearchResult = {
          type: inputType,
          title: `Results for "${searchQuery}"`,
          description:
            inputType === "cve"
              ? "Vulnerability intelligence gathered"
              : inputType === "ip" || inputType === "domain"
              ? "Network investigation initiated"
              : "Graph query executed",
          nodes: data.nodes,
          edges: data.edges,
          taskId: data.taskId,
        };

        setResults([searchResult]);

        if (data.nodes && data.edges && onResults) {
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
    <Card className="h-full flex flex-col bg-gray-900/50 border-gray-800 py-0 gap-0">
      <CardHeader className="px-3 py-2.5 border-b border-gray-800 shrink-0">
        <CardTitle className="text-sm font-semibold text-gray-200 flex items-center gap-2">
          <Search className="h-4 w-4 text-blue-400" />
          Investigate
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 p-3 overflow-hidden flex flex-col gap-3">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch(query);
            }}
            placeholder="Search CVE, IP, domain, threat actor..."
            className="w-full bg-gray-800 border border-gray-700 rounded-md pl-9 pr-9 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
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
              <X className="h-4 w-4 text-gray-500 hover:text-gray-300" />
            </button>
          )}
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleSearch("APT28")}
            className="flex items-center gap-1 px-2 py-1 bg-gray-800/50 border border-gray-700 rounded text-[10px] text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors"
          >
            <Route className="h-3 w-3" />
            Find Attack Path
          </button>
          <button
            onClick={() => handleSearch("CVE-2026-1731")}
            className="flex items-center gap-1 px-2 py-1 bg-gray-800/50 border border-gray-700 rounded text-[10px] text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors"
          >
            <Bug className="h-3 w-3" />
            Scan CVE
          </button>
          <button
            onClick={() => handleSearch("8.8.8.8")}
            className="flex items-center gap-1 px-2 py-1 bg-gray-800/50 border border-gray-700 rounded text-[10px] text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors"
          >
            <Globe className="h-3 w-3" />
            WHOIS Lookup
          </button>
        </div>

        {/* Recent searches */}
        {recentSearches.length > 0 && results.length === 0 && !isLoading && (
          <div className="space-y-1">
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">
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
                  className="px-2 py-0.5 bg-gray-800 rounded text-[10px] text-gray-400 hover:text-gray-200 transition-colors"
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
              className="flex items-center justify-center py-8 text-gray-500"
            >
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Investigating...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-md p-2.5">
            <p className="text-xs text-red-400">{error}</p>
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
                className="bg-gray-800/50 rounded-md p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-200">
                    {result.title}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] text-gray-500 border-gray-700"
                  >
                    {result.type}
                  </Badge>
                </div>
                <p className="text-xs text-gray-400">{result.description}</p>

                {result.nodes && (
                  <p className="text-[10px] text-gray-500">
                    Found {result.nodes.length} nodes, {result.edges?.length || 0}{" "}
                    edges
                  </p>
                )}

                {result.taskId && onViewTrajectory && (
                  <button
                    onClick={() => onViewTrajectory(result.taskId!)}
                    className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300"
                  >
                    <Route className="h-3 w-3" />
                    View Trajectory
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
