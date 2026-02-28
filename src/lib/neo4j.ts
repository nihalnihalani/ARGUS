import neo4j, { Driver } from "neo4j-driver";

let driver: Driver | null = null;

export function getDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(
      process.env.NEO4J_URI!,
      neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!)
    );
  }
  return driver;
}

export async function runQuery<T>(
  cypher: string,
  params?: Record<string, unknown>
): Promise<T[]> {
  const session = getDriver().session({
    database: process.env.NEO4J_DATABASE || "neo4j",
  });
  try {
    const result = await session.run(cypher, params);
    return result.records.map((r) => r.toObject() as T);
  } finally {
    await session.close();
  }
}

const VALID_LABELS = new Set([
  "ThreatActor", "Vulnerability", "Exploit", "Software",
  "Organization", "Malware", "Campaign", "AttackTechnique",
]);

const VALID_KEYS = new Set([
  "name", "cve_id", "mitre_id",
]);

/** Upsert a node — MERGE on a key property, then SET all other properties. */
export async function mergeNode(
  label: string,
  key: string,
  keyValue: string,
  properties: Record<string, unknown>
) {
  if (!VALID_LABELS.has(label)) throw new Error(`Invalid label: ${label}`);
  if (!VALID_KEYS.has(key)) throw new Error(`Invalid key: ${key}`);

  const props = Object.entries(properties)
    .map(([k]) => `n.${k} = $props.${k}`)
    .join(", ");
  const cypher = `MERGE (n:${label} {${key}: $keyValue}) SET ${props}, n.updated_at = datetime() RETURN n`;
  return runQuery(cypher, { keyValue, props: properties });
}

const VALID_RELATIONSHIPS = new Set([
  "USES",
  "TARGETS",
  "AFFECTS",
  "USED_BY",
  "DEPLOYS",
  "EXPLOITS",
  "ATTRIBUTED_TO",
  "EMPLOYS_TECHNIQUE",
  "COLLABORATES_WITH",
  "TARGETS_SECTOR",
  "RELATED_TO",
]);

/** Create a relationship between two nodes (MERGE = idempotent). */
export async function createRelationship(
  sourceLabel: string,
  sourceKey: string,
  sourceValue: string,
  targetLabel: string,
  targetKey: string,
  targetValue: string,
  relType: string,
  relProps?: Record<string, unknown>
) {
  if (!VALID_RELATIONSHIPS.has(relType)) {
    throw new Error(`Invalid relationship type: ${relType}`);
  }
  if (!VALID_LABELS.has(sourceLabel)) throw new Error(`Invalid source label: ${sourceLabel}`);
  if (!VALID_LABELS.has(targetLabel)) throw new Error(`Invalid target label: ${targetLabel}`);
  if (!VALID_KEYS.has(sourceKey)) throw new Error(`Invalid source key: ${sourceKey}`);
  if (!VALID_KEYS.has(targetKey)) throw new Error(`Invalid target key: ${targetKey}`);
  const cypher = `
    MATCH (a:${sourceLabel} {${sourceKey}: $sourceValue})
    MATCH (b:${targetLabel} {${targetKey}: $targetValue})
    MERGE (a)-[r:${relType}]->(b)
    ${relProps ? "SET r += $relProps" : ""}
    RETURN r
  `;
  return runQuery(cypher, { sourceValue, targetValue, relProps });
}

/** Shortest path from a ThreatActor to an Organization — the "money shot". */
export async function findAttackPaths(actorName: string, orgName: string) {
  const cypher = `
    MATCH path = shortestPath(
      (actor:ThreatActor {name: $actorName})-[*..6]->(org:Organization {name: $orgName})
    )
    RETURN [n IN nodes(path) | {
      id: coalesce(n.cve_id, n.name),
      type: labels(n)[0],
      name: coalesce(n.name, n.cve_id)
    }] AS nodes,
    [r IN relationships(path) | {
      type: type(r),
      source: coalesce(startNode(r).cve_id, startNode(r).name),
      target: coalesce(endNode(r).cve_id, endNode(r).name)
    }] AS edges
  `;
  return runQuery(cypher, { actorName, orgName });
}

/** Fetch the full graph for frontend visualization. */
export async function getFullGraph() {
  const cypher = `
    MATCH (n)
    OPTIONAL MATCH (n)-[r]->(m)
    RETURN collect(DISTINCT {
      id: coalesce(n.cve_id, n.name, n.mitre_id),
      type: labels(n)[0],
      properties: properties(n)
    }) AS nodes,
    collect(DISTINCT {
      source: coalesce(startNode(r).cve_id, startNode(r).name, startNode(r).mitre_id),
      target: coalesce(endNode(r).cve_id, endNode(r).name, endNode(r).mitre_id),
      relationship: type(r)
    }) AS edges
  `;
  return runQuery(cypher, {});
}

/** Aggregate statistics for the header stats bar. */
export async function getGraphStats() {
  const cypher = `
    OPTIONAL MATCH (n)
    WITH count(n) AS nodeCount
    OPTIONAL MATCH ()-[r]->()
    WITH nodeCount, count(r) AS edgeCount
    OPTIONAL MATCH (ta:ThreatActor)
    WITH nodeCount, edgeCount, count(ta) AS actorCount
    OPTIONAL MATCH (v:Vulnerability)
    WITH nodeCount, edgeCount, actorCount, count(v) AS vulnCount
    OPTIONAL MATCH (v2:Vulnerability) WHERE v2.severity = 'critical'
    RETURN nodeCount, edgeCount, actorCount, vulnCount, count(v2) AS criticalCount
  `;
  return runQuery(cypher, {});
}
