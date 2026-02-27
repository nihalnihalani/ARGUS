import { NextRequest, NextResponse } from 'next/server';
import { mergeNode, createRelationship } from '@/lib/neo4j';
import type { GraphNode, GraphEdge, NodeType } from '@/lib/types';

// Map node type to the key property used for MERGE
const NODE_KEY_MAP: Record<NodeType, string> = {
  ThreatActor: 'name',
  Vulnerability: 'cve_id',
  Exploit: 'name',
  Software: 'name',
  Organization: 'name',
  Malware: 'name',
  Campaign: 'name',
  AttackTechnique: 'mitre_id',
};

function getKeyValue(node: GraphNode): string {
  const key = NODE_KEY_MAP[node.type];
  if (key === 'cve_id') return node.cve_id || node.name;
  if (key === 'mitre_id') return node.mitre_id || node.name;
  return node.name;
}

function getNodeProperties(node: GraphNode): Record<string, unknown> {
  const props: Record<string, unknown> = { name: node.name };
  if (node.aliases) props.aliases = node.aliases;
  if (node.country) props.country = node.country;
  if (node.motivation) props.motivation = node.motivation;
  if (node.mitre_id) props.mitre_id = node.mitre_id;
  if (node.cve_id) props.cve_id = node.cve_id;
  if (node.cvss != null) props.cvss = node.cvss;
  if (node.severity) props.severity = node.severity;
  if (node.exploited_in_wild != null) props.exploited_in_wild = node.exploited_in_wild;
  if (node.affected_product) props.affected_product = node.affected_product;
  if (node.lat != null) props.lat = node.lat;
  if (node.lon != null) props.lon = node.lon;
  if (node.malware_type) props.malware_type = node.malware_type;
  if (node.uses_ai != null) props.uses_ai = node.uses_ai;
  return props;
}

// Allowlisted labels to prevent Cypher injection
const VALID_LABELS = new Set<string>([
  'ThreatActor', 'Vulnerability', 'Exploit', 'Software',
  'Organization', 'Malware', 'Campaign', 'AttackTechnique',
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nodes, edges } = body as { nodes: GraphNode[]; edges: GraphEdge[] };

    let nodesCreated = 0;
    let edgesCreated = 0;

    // Merge nodes
    if (nodes && Array.isArray(nodes)) {
      for (const node of nodes) {
        if (!VALID_LABELS.has(node.type)) continue;
        const key = NODE_KEY_MAP[node.type];
        const keyValue = getKeyValue(node);
        const properties = getNodeProperties(node);
        await mergeNode(node.type, key, keyValue, properties);
        nodesCreated++;
      }
    }

    // Create relationships
    if (edges && Array.isArray(edges)) {
      // Build a lookup for source/target labels from the nodes array
      const nodeTypeMap = new Map<string, NodeType>();
      if (nodes) {
        for (const n of nodes) {
          nodeTypeMap.set(n.name, n.type);
          if (n.cve_id) nodeTypeMap.set(n.cve_id, n.type);
          if (n.mitre_id) nodeTypeMap.set(n.mitre_id, n.type);
        }
      }

      for (const edge of edges) {
        const sourceType = nodeTypeMap.get(edge.source);
        const targetType = nodeTypeMap.get(edge.target);
        if (!sourceType || !targetType) continue;
        if (!VALID_LABELS.has(sourceType) || !VALID_LABELS.has(targetType)) continue;

        const sourceKey = NODE_KEY_MAP[sourceType];
        const targetKey = NODE_KEY_MAP[targetType];

        await createRelationship(
          sourceType, sourceKey, edge.source,
          targetType, targetKey, edge.target,
          edge.relationship
        );
        edgesCreated++;
      }
    }

    return NextResponse.json({ success: true, nodesCreated, edgesCreated });
  } catch (error) {
    console.error('[graph/ingest]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
