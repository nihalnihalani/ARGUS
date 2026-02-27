# ThreatGraph

Autonomous Cyber Threat Intelligence platform for a hackathon.

## Stack
- **Framework**: Next.js 16 (App Router, React 19, RSC)
- **UI**: shadcn/ui (new-york style), Tailwind CSS 4, Radix UI, Framer Motion, Lucide icons
- **Visualization**: D3.js (force graph), deck.gl (map layers), MapLibre GL
- **Database**: Neo4j (graph DB) via `neo4j-driver`
- **APIs**: Yutori (scouting/browsing/research), Tavily (web search/extract), OpenAI (entity extraction)
- **Language**: TypeScript (strict)

## Project Structure
```
src/
  app/          # Next.js App Router pages and layouts
  components/   # React components (ui/ has shadcn components)
  lib/          # Core logic
    neo4j.ts    # Neo4j driver, Cypher queries
    tavily.ts   # Tavily web search/extract/crawl client
    yutori.ts   # Yutori scouting/browsing/research client
    schema.ts   # JSON schemas for structured AI output
    types.ts    # TypeScript type definitions
    utils.ts    # shadcn utility (cn)
```

## Key Patterns
- Neo4j queries use MERGE for idempotent upserts
- Structured output schemas enforce AI response shapes (Yutori scouts + OpenAI)
- Entity types: ThreatActor, Vulnerability, Exploit, Software, Organization, Malware, Campaign, AttackTechnique
- Relationship types: USES, TARGETS, AFFECTS, EXPLOITS, DEPLOYS, ATTRIBUTED_TO, etc.

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint

## Security Notes
- `.env.local` contains API keys (NEO4J, TAVILY, YUTORI, OPENAI) — never edit or expose
- Neo4j label/key interpolation in `neo4j.ts` is a known Cypher injection risk — always use allowlists for user input
- External URLs passed to Tavily/Yutori must be validated
