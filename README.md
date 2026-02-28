# ARGUS — Autonomous Cyber Threat Intelligence Platform

**ARGUS** is an autonomous threat intelligence platform that continuously monitors the cyber threat landscape, extracts structured intelligence from unstructured data, and visualizes attack relationships in a real-time 3D knowledge graph. Built for the Autonomous Agents Hackathon.

> In February 2026, CISA lost most of its workforce due to government restructuring. ARGUS fills the gap with fully autonomous threat monitoring, entity extraction, and attack path analysis — no human operator required.

---

## Architecture

```
                                    ARGUS Architecture
 ___________________________________________________________________________________________
|                                                                                           |
|   DATA COLLECTION LAYER                                                                   |
|   ______________________     ______________________     ______________________            |
|  |                      |   |                      |   |                      |           |
|  |   Yutori Scouting    |   |   Yutori Browsing    |   |   Yutori Research    |           |
|  |   (Persistent        |   |   (Browser           |   |   (Deep Web          |           |
|  |    Monitoring)        |   |    Automation +      |   |    Research)         |           |
|  |                      |   |    Trajectory)        |   |                      |           |
|  |______________________|   |______________________|   |______________________|           |
|            |                          |                          |                         |
|            +------------- Scout Updates / Raw Intel -------------+                         |
|                                       |                                                   |
|   ____________________________________v___________________________________________        |
|  |                                                                                |       |
|  |                        ENRICHMENT LAYER                                        |       |
|  |   _________________     __________________     __________________              |       |
|  |  |                 |   |                  |   |                  |             |       |
|  |  | Tavily Search   |   | Tavily Extract   |   | Tavily Crawl    |             |       |
|  |  | (CVE News,      |   | (IOC Extraction  |   | (Site Traversal |             |       |
|  |  |  Threat Intel)  |   |  from URLs)      |   |  + Content)     |             |       |
|  |  |_________________|   |__________________|   |__________________|             |       |
|  |________________________________________________________________________|       |       |
|                                       |                                           |       |
|   ____________________________________v___________________________________________        |
|  |                                                                                |       |
|  |                     EXTRACTION LAYER (Parallel)                                |       |
|  |   _________________     __________________     ___________________             |       |
|  |  |                 |   |                  |   |                   |            |       |
|  |  | OpenAI GPT-4o   |   | GLiNER-2         |   | Reka Vision       |            |       |
|  |  | (Structured     |   | (Zero-Shot NER,  |   | (Screenshot       |            |       |
|  |  |  Extraction +   |   |  Entity Labels,  |   |  Analysis,        |            |       |
|  |  |  Threat Brief)  |   |  Classification) |   |  Phishing Detect) |            |       |
|  |  |_________________|   |__________________|   |___________________|            |       |
|  |           |                     |                        |                     |       |
|  |           +--- Merged Entities (Union + Dedup) ----------+                     |       |
|  |________________________________________________________________________|       |       |
|                                       |                                           |       |
|   ____________________________________v___________________________________________        |
|  |                                                                                |       |
|  |                        KNOWLEDGE GRAPH                                         |       |
|  |                                                                                |       |
|  |                    Neo4j (MERGE Upserts)                                       |       |
|  |                                                                                |       |
|  |   Nodes: ThreatActor, Vulnerability, Exploit, Software,                        |       |
|  |          Organization, Malware, Campaign, AttackTechnique                      |       |
|  |                                                                                |       |
|  |   Edges: USES, TARGETS, AFFECTS, EXPLOITS, DEPLOYS,                            |       |
|  |          ATTRIBUTED_TO, EMPLOYS_TECHNIQUE, COLLABORATES_WITH                   |       |
|  |                                                                                |       |
|  |   Queries: Shortest Attack Paths, Full Graph, Stats                            |       |
|  |________________________________________________________________________|       |       |
|                                       |                                           |       |
|   ____________________________________v___________________________________________        |
|  |                                                                                |       |
|  |                      VISUALIZATION LAYER                                       |       |
|  |   _________________     __________________     ___________________             |       |
|  |  |                 |   |                  |   |                   |            |       |
|  |  | 3D Force Graph  |   | 2D Force Graph   |   | Global Attack Map |            |       |
|  |  | (Three.js +     |   | (D3.js SVG       |   | (deck.gl +        |            |       |
|  |  |  Bloom + Auto-  |   |  Force Layout)   |   |  MapLibre GL +    |            |       |
|  |  |  Rotate)        |   |                  |   |  Attack Arcs)     |            |       |
|  |  |_________________|   |__________________|   |___________________|            |       |
|  |________________________________________________________________________|       |       |
|                                                                                           |
|   ADDITIONAL MODULES                                                                      |
|   _________________     __________________                                                |
|  |                 |   |                  |                                               |
|  | Modulate        |   | Voice Analysis   |                                               |
|  | (Vishing &      |   | (Deepfake        |                                               |
|  |  Deepfake       |   |  Detection)      |                                               |
|  |  Detection)     |   |  [Stub]          |                                               |
|  |_________________|   |__________________|                                               |
|___________________________________________________________________________________________|
```

---

## Sponsor Technologies

### Yutori — Autonomous Data Collection

Yutori powers ARGUS's autonomous intelligence gathering through three API surfaces:

- **Scouting API** — Persistent monitoring agents that continuously scan threat feeds, CVE databases, and dark web forums. Scouts run on configurable intervals and push structured updates via webhooks. ARGUS creates scouts for specific threat queries (e.g., "critical vulnerabilities in enterprise VPN software") and polls for new intelligence.

- **Browsing API** — Browser automation that navigates threat intelligence sources, extracts data, and captures step-by-step trajectories with screenshots. Used for investigating specific URLs and threat actor infrastructure. Each browsing task returns a full trajectory with screenshots at every navigation step.

- **Research API** — Deep web research for in-depth investigation. When a user triggers "Deep Investigation" on a graph node, ARGUS dispatches a Yutori Research task to gather comprehensive intelligence about a specific threat actor, vulnerability, or campaign.

**Integration points:** `src/lib/yutori.ts`, `src/app/api/scouts/*`, `src/app/api/browse/*`, `src/app/api/research/*`

---

### Tavily — Web Search & Content Enrichment

Tavily provides real-time web intelligence through five endpoints:

- **Search** — Advanced web search for CVE news, exploit disclosures, and threat actor activity. The pipeline automatically searches for the latest news on every new CVE detected.

- **Extract** — Structured content extraction from up to 20 URLs simultaneously. Used to pull IOCs and threat data from source URLs found in scout updates.

- **Map** — URL structure discovery for site reconnaissance. Maps out the link structure of threat intelligence sites.

- **Crawl** — Graph-based web traversal with depth control. Falls back to Map + Extract if the crawl endpoint is unavailable.

- **Research** — Multi-step research synthesis for complex threat queries.

**Integration points:** `src/lib/tavily.ts`, `src/app/api/tavily/*`

---

### Neo4j — Knowledge Graph Database

Neo4j stores the threat intelligence knowledge graph using a labeled property graph model:

- **8 Node Types:** ThreatActor, Vulnerability, Exploit, Software, Organization, Malware, Campaign, AttackTechnique
- **10+ Relationship Types:** USES, TARGETS, AFFECTS, EXPLOITS, DEPLOYS, ATTRIBUTED_TO, EMPLOYS_TECHNIQUE, COLLABORATES_WITH, TARGETS_SECTOR, RELATED_TO
- **MERGE Upserts** — All writes use Cypher `MERGE` for idempotent ingestion (no duplicates)
- **Attack Path Queries** — `shortestPath()` finds the shortest attack chain from a ThreatActor to an Organization through up to 6 hops
- **Allowlist Validation** — All labels, keys, and relationship types are validated against allowlists to prevent Cypher injection

**Integration points:** `src/lib/neo4j.ts`, `src/app/api/graph/*`

---

### OpenAI — Entity Extraction & Threat Briefings

OpenAI GPT-4o provides the primary intelligence analysis:

- **Structured Entity Extraction** — Uses JSON Schema `response_format` to extract threat actors, vulnerabilities (with CVE IDs and CVSS scores), exploits, malware, campaigns, MITRE ATT&CK techniques, and their relationships from raw text. Returns typed entities with metadata (severity, country, motivation, aliases).

- **Executive Threat Briefings** — Generates actionable briefings from the current knowledge graph state and new findings. Includes overall threat level, top threats, detected attack paths, CISA relevance, and recommended actions.

- **Threat Classification** — Function calling with tools (`search_cve`, `investigate_ip`, `research_actor`, `enrich_malware`) lets GPT-4o autonomously decide which enrichment actions to take.

- **Embeddings** — `text-embedding-3-large` generates 256-dimensional vectors for semantic similarity searches across threat intel.

**Integration points:** `src/lib/openai-client.ts`, `src/lib/schema.ts`

---

### Fastino Labs (GLiNER-2) — Zero-Shot Named Entity Recognition

GLiNER-2 via the Pioneer API provides a fast, complementary NER pipeline that runs in parallel with OpenAI:

- **Entity Extraction** — Zero-shot NER across 15 cyber-specific labels: threat_actor, malware, cve_id, ip_address, domain, hash, mitre_technique, organization, software, exploit, campaign, vulnerability, email, url, file_path. No fine-tuning required — labels are provided at inference time.

- **Text Classification** — Classifies text against 8 threat categories: ransomware, apt, phishing, zero_day, supply_chain, insider_threat, ddos, data_breach.

- **Parallel Extraction Pipeline** — GLiNER and OpenAI run concurrently via `Promise.allSettled()`. Results are merged with union + dedup (OpenAI entities have priority for detail, GLiNER fills gaps).

- **IOC Separation** — Entities are classified into graph nodes (ThreatActor, Malware, etc.) vs. IOC-only types (IP addresses, domains, hashes) that get separate handling.

**Integration points:** `src/lib/fastino.ts`, `src/app/api/gliner/*`

---

### Reka Vision — Multimodal Screenshot Analysis

Reka Flash provides visual threat intelligence through screenshot analysis:

- **Phishing Detection** — Analyzes webpage screenshots for suspicious URLs, fake login forms, brand impersonation, urgency tactics, and mismatched certificates. Returns a structured phishing assessment with confidence score.

- **Dark Web Forum Analysis** — Extracts threat actors, malware names, CVE references, and target organizations from forum screenshots.

- **Malware C2 Panel Analysis** — Identifies malware families, C2 indicators, victim statistics, and campaign details from command-and-control panel screenshots.

- **Auto-Classification** — Screenshots are first classified as phishing, forum, malware, or general, then routed to the appropriate specialized analyzer.

- **Trajectory Analysis** — Analyzes Yutori browsing trajectories to assess risk across navigation steps.

**Integration points:** `src/lib/reka.ts`, `src/app/api/reka/*`

---

### Modulate — Voice Threat Detection (Stub)

Modulate is architected for real-time voice analysis (awaiting API access):

- **Vishing Detection** — Identifies social engineering patterns and abnormal speech cadence in voice calls.
- **Deepfake Audio Detection** — TruVoice analyzes voice biometrics, spectral patterns, and temporal consistency to detect synthetic speech.
- **Toxicity Scoring** — Real-time toxic speech monitoring.

Currently returns realistic stub data with `isStub: true` flag. All function signatures and types are production-ready for immediate integration when the API becomes available.

**Integration points:** `src/lib/modulate.ts`, `src/app/api/modulate/*`

---

## Features

- **3D Threat Knowledge Graph** — Three.js-powered force-directed graph with bloom glow, directional particles, fly-to camera, and auto-rotate
- **2D Force Graph** — D3.js SVG fallback with force simulation and edge particles
- **Global Attack Map** — deck.gl + MapLibre GL visualization of geo-located attack arcs between threat actors and target organizations
- **Autonomous Scouting** — Yutori scouts continuously monitor configurable threat queries
- **Deep Investigation** — One-click deep research on any graph node via Yutori Research API
- **Dual NER Pipeline** — OpenAI + GLiNER run in parallel for maximum entity extraction coverage
- **Visual Threat Analysis** — Reka Vision analyzes screenshots for phishing, C2 panels, and forum content
- **Attack Path Analysis** — Neo4j shortest-path queries reveal how threat actors reach target organizations
- **Executive Threat Briefings** — AI-generated briefings with threat level, key findings, and recommended actions
- **Real-Time Live Feed** — Streaming feed of new entities, CVE disclosures, and enrichment results
- **Browsing Trajectory Viewer** — Step-by-step visualization of Yutori browser automation with screenshots
- **NER Comparison Panel** — Side-by-side comparison of GLiNER vs. OpenAI entity extraction results
- **Command Palette** — Quick-access command bar for all platform actions

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19, RSC) |
| Language | TypeScript (strict) |
| UI Components | shadcn/ui, Radix UI, Tailwind CSS 4, Framer Motion |
| 3D Visualization | Three.js, react-force-graph-3d, three-spritetext, UnrealBloomPass |
| 2D Visualization | D3.js (force simulation + SVG) |
| Map Visualization | deck.gl, MapLibre GL, react-map-gl |
| Graph Database | Neo4j (neo4j-driver) |
| AI / NER | OpenAI GPT-4o, GLiNER-2 (Pioneer API) |
| Vision AI | Reka Flash |
| Web Intelligence | Tavily (Search, Extract, Map, Crawl, Research) |
| Autonomous Agents | Yutori (Scouting, Browsing, Research) |
| Voice Analysis | Modulate (stub) |

---

## Getting Started

### Prerequisites

- Node.js 20+
- Neo4j database instance (local or Aura)
- API keys for: Yutori, Tavily, OpenAI, GLiNER (Pioneer), Reka

### Environment Setup

Create `.env.local` in the `threat-graph/` directory:

```env
# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password
NEO4J_DATABASE=neo4j

# Yutori
YUTORI_API_KEY=your-yutori-key

# Tavily
TAVILY_API_KEY=your-tavily-key

# OpenAI
OPENAI_API_KEY=your-openai-key

# GLiNER (Fastino Labs / Pioneer)
GLINER_API_KEY=your-gliner-key

# Reka
REKA_API_KEY=your-reka-key

# Pipeline Auth (optional)
PIPELINE_SECRET=your-secret
```

### Install & Run

```bash
cd threat-graph
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### Seed the Graph

```bash
npm run seed
```

---

## Project Structure

```
threat-graph/
  src/
    app/
      api/
        graph/          # Neo4j graph CRUD (query, ingest, path, stats)
        pipeline/       # Ingest pipeline (extraction + enrichment + Neo4j write)
        scouts/         # Yutori scout management (create, poll, manage, webhook)
        browse/         # Yutori browsing (investigate, trajectory)
        research/       # Yutori deep research (deepdive)
        tavily/         # Tavily endpoints (search, extract, map, crawl, research)
        gliner/         # GLiNER NER (extract, compare)
        reka/           # Reka Vision (analyze, trajectory-analyze)
        modulate/       # Modulate voice analysis (analyze)
        analyze/        # OpenAI threat classification
    components/
      Dashboard.tsx         # Main orchestrator — state management, polling, panels
      Header.tsx            # Navigation bar with visualizer toggle
      ThreatGraph3D.tsx     # Three.js 3D force graph with bloom
      ThreatGraph.tsx       # D3.js 2D SVG force graph
      AttackMap.tsx          # deck.gl global attack arc map
      AttackMapInner.tsx     # Map inner component (deck.gl layers)
      LiveFeed.tsx           # Real-time intelligence feed
      ThreatBrief.tsx        # Executive threat briefing panel
      GraphStats.tsx         # Knowledge graph statistics
      SearchBar.tsx          # Search interface
      CommandPalette.tsx     # Command palette (Cmd+K)
      TrajectoryViewer.tsx   # Yutori browsing trajectory viewer
      ExtractionComparison.tsx  # GLiNER vs OpenAI NER comparison
      VisionAnalysis.tsx     # Reka Vision analysis display
      ui/                    # shadcn/ui components + custom UI
    lib/
      neo4j.ts          # Neo4j driver, Cypher queries, allowlist validation
      yutori.ts         # Yutori client (scouting, browsing, research)
      tavily.ts         # Tavily client (search, extract, map, crawl, research)
      openai-client.ts  # OpenAI GPT-4o extraction, briefings, embeddings
      fastino.ts        # GLiNER-2 NER, classification, structured extraction
      reka.ts           # Reka Vision screenshot analysis
      modulate.ts       # Modulate voice analysis (stub)
      schema.ts         # JSON schemas for structured AI output
      types.ts          # TypeScript type definitions
```

---

## Pipeline Flow

When a Yutori scout delivers an update, the ingest pipeline processes it through 7 steps:

1. **Entity Extraction** — Parse structured Yutori output; fallback to parallel GLiNER + OpenAI extraction with merged results
2. **CVE Enrichment** — Tavily search for latest news on each detected CVE
3. **Screenshot Analysis** — Reka Vision analyzes any screenshots found in the data
4. **Deep Extraction** — Second-pass GLiNER + OpenAI extraction on Tavily-extracted content
5. **Neo4j Write** — MERGE all entities and relationships into the knowledge graph
6. **Feed Generation** — Build live feed items from findings and enrichment results
7. **Threat Briefing** — GPT-4o generates an executive briefing from graph state + new findings

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/graph/query` | GET | Fetch full knowledge graph for visualization |
| `/api/graph/ingest` | POST | Write nodes and edges to Neo4j |
| `/api/graph/path` | POST | Find shortest attack path between entities |
| `/api/graph/stats` | GET | Get graph statistics |
| `/api/pipeline/ingest` | POST | Full ingest pipeline (extract + enrich + write) |
| `/api/scouts/create` | POST | Create a Yutori scouting task |
| `/api/scouts/poll` | GET | Poll a scout for updates |
| `/api/scouts/manage` | GET/DELETE | List or delete scouts |
| `/api/scouts/webhook` | POST | Receive Yutori webhook callbacks |
| `/api/browse/investigate` | POST | Launch Yutori browsing task |
| `/api/browse/trajectory` | GET | Get browsing task trajectory |
| `/api/research/deepdive` | POST/GET | Deep investigation via Yutori Research |
| `/api/tavily/search` | POST | Tavily web search |
| `/api/tavily/extract` | POST | Tavily URL content extraction |
| `/api/tavily/map` | POST | Tavily URL structure mapping |
| `/api/tavily/crawl` | POST | Tavily site crawl |
| `/api/tavily/research` | POST | Tavily multi-step research |
| `/api/gliner/extract` | POST | GLiNER-2 entity extraction |
| `/api/gliner/compare` | POST | Side-by-side GLiNER vs OpenAI comparison |
| `/api/reka/analyze` | POST | Reka Vision screenshot analysis |
| `/api/reka/trajectory-analyze` | POST | Reka trajectory analysis |
| `/api/modulate/analyze` | POST | Modulate voice analysis (stub) |
| `/api/analyze` | POST | OpenAI threat classification |

---

## License

Built for the Autonomous Agents Hackathon.
