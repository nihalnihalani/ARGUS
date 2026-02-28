# ARGUS ThreatGraph — Sponsor Integrations

ARGUS ThreatGraph integrates **6 sponsor tools** to deliver autonomous cyber threat intelligence:

## Core Platform (Already Integrated)

| Sponsor | Integration | Role |
|---------|-------------|------|
| **Yutori** | Scouting, Browsing, Research APIs | Autonomous intelligence gathering agents |
| **Neo4j** | Graph Database | Threat relationship knowledge graph |
| **Tavily** | Web Search + Extract | CVE enrichment and IOC extraction |

## New Integrations

| Sponsor | Integration | Role |
|---------|-------------|------|
| **Fastino GLiNER** | Zero-shot NER + Relation Extraction | Entity extraction (parallel with OpenAI) |
| **Reka Vision** | Multimodal Screenshot Analysis | Phishing detection, dark web analysis |
| **Modulate** | Voice Threat Detection (Stub) | Vishing/deepfake detection architecture |

## Architecture

```
Scout Webhook -> pipeline/ingest
  |
  +- Step 1a: Yutori structured JSON (existing)
  +- Step 1b: GLiNER extraction (NEW, parallel)      <- Fastino
  +- Step 1c: OpenAI extraction (existing, parallel)
  +- Step 1d: Merge results (union + dedup)
  |
  +- Step 2: Tavily CVE enrichment (existing)
  +- Step 2.5: Reka screenshot analysis (NEW)         <- Reka
  +- Step 3: Deep extraction via GLiNER (MODIFIED)     <- Fastino
  |
  +- Step 4: Neo4j merge (existing)
  +- Step 5: Feed items (existing + new sources)
  +- Step 6: Threat brief (existing)
```

## API Endpoints

### GLiNER (Fastino)
- `POST /api/gliner/extract` — Extract entities from text using GLiNER
- `POST /api/gliner/compare` — Side-by-side GLiNER vs OpenAI comparison with F1 score

### Reka Vision
- `POST /api/reka/analyze` — Analyze a single screenshot for threats
- `POST /api/reka/trajectory-analyze` — Bulk-analyze all screenshots in a Yutori browsing trajectory

### Modulate (Stub)
- `POST /api/modulate/analyze` — Voice threat detection (stub, awaiting API access)

## Documentation

- [Fastino GLiNER Integration](./fastino-gliner.md)
- [Reka Vision Integration](./reka-vision.md)
- [Modulate Voice Detection](./modulate.md)
