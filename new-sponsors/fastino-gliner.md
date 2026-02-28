# Fastino GLiNER Integration

## Overview

GLiNER (Generalist and Lightweight Model for Named Entity Recognition) provides zero-shot NER that extracts any entity type specified at inference time. We use it as a parallel extraction engine alongside OpenAI GPT-4o to maximize entity coverage and provide extraction quality comparison.

## Why GLiNER?

1. **Zero-shot flexibility** — No fine-tuning needed; specify entity labels at inference
2. **Speed** — 205M-1B param models run significantly faster than GPT-4o
3. **Complementary** — Different model architecture catches entities GPT-4o misses (and vice versa)
4. **Cost-effective** — Reduces dependency on expensive LLM calls

## Integration Points

### 1. Parallel Entity Extraction (Pipeline Step 1b)

When scout updates arrive, we run GLiNER and OpenAI extraction in parallel:

```
scoutUpdate -> [GLiNER extraction] -+-> merge (union + dedup by name)
                                    |
             [OpenAI extraction]  --+
```

Results are merged using union strategy with deduplication by entity name (case-insensitive). When both engines extract the same entity, we keep the one with higher confidence.

### 2. Deep Extraction (Pipeline Step 3)

Tavily-enriched content is also processed through GLiNER for secondary extraction, catching entities that the primary OpenAI pass may have missed.

### 3. Side-by-Side Comparison (`/api/gliner/compare`)

Critical for demo — judges can submit threat text and see real-time comparison:
- Entity counts from each engine
- IOC counts from each engine
- Extraction time (ms) for each
- Overlap metrics: shared entities, engine-exclusive entities
- F1 estimate: `2 * |shared| / (|gliner| + |openai|)`

## Entity Label Mapping

GLiNER labels map to our NodeType system:

| GLiNER Label | NodeType | Category |
|---|---|---|
| threat_actor | ThreatActor | Entity |
| malware | Malware | Entity |
| cve_id | Vulnerability | Entity |
| organization | Organization | Entity |
| software | Software | Entity |
| exploit | Exploit | Entity |
| campaign | Campaign | Entity |
| vulnerability | Vulnerability | Entity |
| mitre_technique | AttackTechnique | Entity |
| ip_address | — | IOC |
| domain | — | IOC |
| hash | — | IOC |
| email | — | IOC |
| url | — | IOC |
| file_path | — | IOC |

## F1 Score Methodology

We estimate extraction quality using a simplified F1 calculation:

1. **Entity normalization**: Lowercase, trim whitespace
2. **Matching**: String equality after normalization
3. **Precision** (GLiNER perspective): `|shared| / |gliner_total|`
4. **Recall** (GLiNER perspective): `|shared| / |openai_total|`
5. **F1**: `2 * precision * recall / (precision + recall)`

This treats OpenAI as the reference standard. A high F1 (>0.7) indicates GLiNER captures most of what GPT-4o finds. A lower F1 with high GLiNER-only count suggests GLiNER finds additional entities GPT-4o misses.

## API Reference

### `POST /api/gliner/extract`
```json
{
  "text": "APT28 exploited CVE-2026-1731...",
  "labels": ["threat_actor", "cve_id"]  // optional, defaults to full cyber set
}
```

### `POST /api/gliner/compare`
```json
{
  "text": "APT28 exploited CVE-2026-1731..."
}
```

## Configuration

```env
GLINER_API_URL=https://gliner.pioneer.ai
GLINER_API_KEY=<from_hackathon>
```
