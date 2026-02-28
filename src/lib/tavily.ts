const BASE_URL = "https://api.tavily.com";

function apiKey() {
  return process.env.TAVILY_API_KEY!;
}

async function request<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({ api_key: apiKey(), ...body }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tavily ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

/** Web search with optional domain filtering. */
export async function search(
  query: string,
  options?: {
    search_depth?: "basic" | "advanced";
    include_domains?: string[];
    exclude_domains?: string[];
    max_results?: number;
    include_raw_content?: boolean;
  }
) {
  return request<{
    results: {
      title: string;
      url: string;
      content: string;
      raw_content?: string;
      score: number;
    }[];
    query: string;
  }>("/search", { query, ...options });
}

/** Extract structured content from up to 20 URLs. */
export async function extract(urls: string[]) {
  return request<{
    results: {
      url: string;
      raw_content: string;
    }[];
    failed_results: { url: string; error: string }[];
  }>("/extract", { urls });
}

/** Discover URL structure of a website. */
export async function map(
  url: string,
  options?: {
    search_depth?: "basic" | "advanced";
    max_results?: number;
  }
) {
  return request<{
    urls: string[];
  }>("/map", { url, ...options });
}

/** Graph-based web traversal. Falls back to map + extract if unavailable. */
export async function crawl(
  url: string,
  options?: {
    max_depth?: number;
    max_pages?: number;
    select_paths?: string[];
  }
) {
  try {
    return await request<{
      results: { url: string; raw_content: string }[];
    }>("/crawl", { url, ...options });
  } catch {
    // Fallback: map the site then extract top URLs
    const mapped = await map(url, { max_results: options?.max_pages ?? 5 });
    const extracted = await extract(mapped.urls.slice(0, 20));
    return { results: extracted.results };
  }
}

/** Multi-step research synthesis. */
export async function research(query: string) {
  return request<{
    answer: string;
    sources: { title: string; url: string; content: string }[];
  }>("/research", { query });
}
