import type { GlinerEntity, GlinerRelation, NodeType } from "@/lib/types";

// ---- Configuration ----

// Pioneer GLiNER-2 API — always use api.pioneer.ai (gliner.pioneer.ai is the web UI)
const GLINER_API_URL = "https://api.pioneer.ai";
const FETCH_TIMEOUT_MS = 30_000;

function getApiKey(): string {
  const key = process.env.GLINER_API_KEY;
  if (!key) {
    console.warn("[fastino] GLINER_API_KEY is not set — API calls will fail");
  }
  return key ?? "";
}

function headers() {
  return {
    "Content-Type": "application/json",
    "x-api-key": getApiKey(),
  };
}

// ---- Label Constants ----

export const CYBER_ENTITY_LABELS = [
  "threat_actor",
  "malware",
  "cve_id",
  "ip_address",
  "domain",
  "hash",
  "mitre_technique",
  "organization",
  "software",
  "exploit",
  "campaign",
  "vulnerability",
  "email",
  "url",
  "file_path",
] as const;

export const CYBER_RELATION_LABELS = [
  "uses",
  "targets",
  "exploits",
  "attributed_to",
  "deploys",
  "affects",
  "collaborates_with",
] as const;

export const THREAT_CLASSIFICATION_LABELS = [
  "ransomware",
  "apt",
  "phishing",
  "zero_day",
  "supply_chain",
  "insider_threat",
  "ddos",
  "data_breach",
] as const;

/**
 * Maps GLiNER entity labels to graph node types.
 * IOC-only types (ip_address, domain, hash, email, url, file_path) map to null
 * because they become IOC entries rather than graph nodes.
 */
export const GLINER_LABEL_TO_NODE_TYPE: Record<string, NodeType | null> = {
  threat_actor: "ThreatActor",
  malware: "Malware",
  cve_id: "Vulnerability",
  organization: "Organization",
  software: "Software",
  exploit: "Exploit",
  campaign: "Campaign",
  vulnerability: "Vulnerability",
  mitre_technique: "AttackTechnique",
  // IOC types — do not map to graph nodes
  ip_address: null,
  domain: null,
  hash: null,
  email: null,
  url: null,
  file_path: null,
};

/** Set of labels that represent IOC-only types (no graph node). */
const IOC_LABELS = new Set([
  "ip_address",
  "domain",
  "hash",
  "email",
  "url",
  "file_path",
]);

// ---- Pioneer GLiNER-2 API ----

interface GlinerApiEntity {
  text: string;
  confidence: number;
  start: number;
  end: number;
}

type GlinerApiResponse = {
  result: {
    entities: Record<string, GlinerApiEntity[]>;
  };
  token_usage: number;
};

type GlinerClassifyResponse = {
  result: Record<string, number>;
  token_usage: number;
};

/** Extract named entities from text using Pioneer GLiNER-2. */
export async function extractEntitiesGliner(
  text: string,
  labels?: string[]
): Promise<GlinerEntity[]> {
  try {
    const res = await fetch(`${GLINER_API_URL}/gliner-2`, {
      method: "POST",
      headers: headers(),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      body: JSON.stringify({
        task: "extract_entities",
        text,
        schema: labels || [...CYBER_ENTITY_LABELS],
        threshold: 0.3,
        include_confidence: true,
        include_spans: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`GLiNER NER failed (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as GlinerApiResponse;

    // Flatten the nested response into flat GlinerEntity[]
    const entities: GlinerEntity[] = [];
    for (const [label, items] of Object.entries(data.result?.entities || {})) {
      for (const item of items) {
        entities.push({
          text: item.text,
          label,
          score: item.confidence,
          start: item.start,
          end: item.end,
        });
      }
    }
    return entities;
  } catch (error) {
    console.error("[fastino/extractEntitiesGliner]", error);
    return [];
  }
}

/** Extract relations using GLiNER-2 with relation schema. */
export async function extractRelations(
  text: string,
  relationLabels?: string[]
): Promise<GlinerRelation[]> {
  try {
    // GLiNER-2 doesn't have a dedicated relation endpoint.
    // Use extract_entities with relation-oriented labels as a workaround,
    // then infer relations from co-occurring entities.
    // For now, return empty — relations come from OpenAI in the pipeline.
    void relationLabels;
    void text;
    return [];
  } catch (error) {
    console.error("[fastino/extractRelations]", error);
    return [];
  }
}

/** Classify text against threat-type labels using GLiNER-2. */
export async function classifyText(
  text: string,
  labels?: string[]
): Promise<{ label: string; score: number }[]> {
  try {
    const res = await fetch(`${GLINER_API_URL}/gliner-2`, {
      method: "POST",
      headers: headers(),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      body: JSON.stringify({
        task: "classify_text",
        text,
        schema: labels || [...THREAT_CLASSIFICATION_LABELS],
        threshold: 0.3,
        include_confidence: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`GLiNER classify failed (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as GlinerClassifyResponse;

    // Map result object to array of {label, score}
    return Object.entries(data.result || {}).map(([label, score]) => ({
      label,
      score: typeof score === "number" ? score : 0,
    }));
  } catch (error) {
    console.error("[fastino/classifyText]", error);
    return [];
  }
}

// ---- Composite Extraction ----

/**
 * Run entity extraction + classification in parallel and map to
 * the same structured format used by openai-client.ts extractEntities.
 */
export async function extractStructuredThreatData(text: string) {
  const [entities, relations, classifications] = await Promise.all([
    extractEntitiesGliner(text),
    extractRelations(text),
    classifyText(text),
  ]);

  // Separate entities into graph nodes vs IOCs
  const mappedEntities: { type: string; name: string }[] = [];
  const iocs: { type: string; value: string; context: string }[] = [];

  for (const entity of entities) {
    if (IOC_LABELS.has(entity.label)) {
      iocs.push({
        type: entity.label,
        value: entity.text,
        context: text.slice(
          Math.max(0, entity.start - 40),
          Math.min(text.length, entity.end + 40)
        ),
      });
    } else {
      const nodeType = GLINER_LABEL_TO_NODE_TYPE[entity.label];
      if (nodeType) {
        mappedEntities.push({
          type: nodeType,
          name: entity.text,
        });
      }
    }
  }

  // Map relations to the pipeline relationship format
  const relationships = relations.map((rel) => ({
    source: rel.head,
    target: rel.tail,
    relationship: rel.relation.toUpperCase(),
  }));

  return {
    entities: mappedEntities,
    relationships,
    iocs,
    classifications,
  };
}
