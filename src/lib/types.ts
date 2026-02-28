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
  source: "nvd" | "twitter" | "github" | "news" | "system" | "gliner" | "reka" | "modulate";
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

// --- Sponsor Integration Types ---

export interface GlinerEntity {
  text: string;
  label: string;
  score: number;
  start: number;
  end: number;
}

export interface GlinerRelation {
  head: string;
  tail: string;
  relation: string;
  score: number;
}

export interface GlinerExtractionResult {
  entities: GlinerEntity[];
  relations: GlinerRelation[];
  iocs: { type: string; value: string; context: string }[];
  classifications: { label: string; score: number }[];
}

export interface ExtractionComparison {
  gliner: {
    entities: GlinerEntity[];
    entityCount: number;
    iocCount: number;
    extractionTimeMs: number;
  };
  openai: {
    entities: { type: string; name: string }[];
    entityCount: number;
    iocCount: number;
    extractionTimeMs: number;
  };
  overlap: {
    sharedEntities: string[];
    glinerOnly: string[];
    openaiOnly: string[];
    f1Estimate: number;
  };
}

export interface VisualAnalysis {
  imageUrl: string;
  analysisType: "phishing" | "forum" | "malware" | "general";
  isPhishing: boolean;
  confidence: number;
  riskLevel: "critical" | "high" | "medium" | "low" | "none";
  indicators: string[];
  entitiesFound: { type: string; name: string }[];
  summary: string;
  model: string;
}

export interface VoiceAnalysisResult {
  audioUrl: string;
  toxicity: { score: number; label: string };
  vishing: { isVishing: boolean; confidence: number; indicators: string[] };
  deepfake: { isDeepfake: boolean; confidence: number };
  sentiment: string;
  transcript?: string;
  isStub: true;
}
