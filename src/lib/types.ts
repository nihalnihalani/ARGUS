// Graph node types
export type NodeType =
  | "ThreatActor"
  | "Vulnerability"
  | "Exploit"
  | "Software"
  | "Organization"
  | "Malware"
  | "Campaign"
  | "AttackTechnique";

export interface GraphNode {
  id: string;
  type: NodeType;
  name: string;
  // ThreatActor fields
  aliases?: string[];
  country?: string;
  motivation?:
    | "espionage"
    | "financial"
    | "hacktivism"
    | "destruction"
    | "unknown";
  mitre_id?: string;
  // Vulnerability fields
  cve_id?: string;
  cvss?: number;
  severity?: "critical" | "high" | "medium" | "low";
  exploited_in_wild?: boolean;
  affected_product?: string;
  // Geo fields (for deck.gl)
  lat?: number;
  lon?: number;
  // Malware fields
  malware_type?: string;
  uses_ai?: boolean;
  // UI state
  isNew?: boolean;
  // D3 simulation fields
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export type RelationshipType =
  | "USES"
  | "TARGETS"
  | "AFFECTS"
  | "USED_BY"
  | "DEPLOYS"
  | "EXPLOITS"
  | "ATTRIBUTED_TO"
  | "EMPLOYS_TECHNIQUE"
  | "COLLABORATES_WITH"
  | "TARGETS_SECTOR"
  | "RELATED_TO";

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: RelationshipType;
  isAttackPath?: boolean;
}

export interface AttackArc {
  id: string;
  actorName: string;
  campaignName?: string;
  sourceLat: number;
  sourceLon: number;
  targetLat: number;
  targetLon: number;
  targetOrg: string;
  severity: "critical" | "high" | "medium" | "low";
  cves: string[];
}

export interface FeedItem {
  id: string;
  timestamp: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  source: "nvd" | "twitter" | "github" | "news" | "system";
  title: string;
  description: string;
  sourceUrl?: string;
  entities?: { type: NodeType; name: string }[];
}

export interface ThreatBrief {
  overall_threat_level:
    | "critical"
    | "high"
    | "elevated"
    | "moderate"
    | "low";
  headline: string;
  executive_summary: string;
  top_threats: {
    threat: string;
    severity: number;
    affected_sectors: string[];
    recommended_action: string;
  }[];
  attack_paths_detected: {
    from_actor: string;
    through_vulnerability: string;
    to_target: string;
    risk_score: number;
  }[];
  cisa_relevant: string;
  recommended_actions: string[];
}

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  threatActorCount: number;
  vulnerabilityCount: number;
  criticalCount: number;
  activeScouts: number;
  lastUpdate: string;
}

export interface TrajectoryStep {
  url: string;
  action: string;
  data_extracted?: string;
  screenshot_url?: string;
  timestamp: string;
}

export interface PipelineResult {
  newNodes: GraphNode[];
  newEdges: GraphEdge[];
  threatBrief: ThreatBrief;
  feedItems: FeedItem[];
}
