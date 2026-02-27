/**
 * JSON schemas for structured output from Yutori scouts and OpenAI.
 * These schemas enforce the shape of AI-generated responses so we can
 * reliably parse them into GraphNode / GraphEdge types.
 */

// ---------------------------------------------------------------------------
// 1. Yutori Scouting structured output schema
//    Passed as `output_schema` when creating a scout task. Yutori returns
//    JSON matching this shape in each update.
// ---------------------------------------------------------------------------
export const threatIntelSchema = {
  type: "object" as const,
  properties: {
    entities: {
      type: "array" as const,
      description: "All threat entities extracted from monitored sources",
      items: {
        type: "object" as const,
        properties: {
          type: {
            type: "string" as const,
            enum: [
              "ThreatActor",
              "Vulnerability",
              "Exploit",
              "Software",
              "Organization",
              "Malware",
              "Campaign",
              "AttackTechnique",
            ],
            description: "The category of this entity",
          },
          name: {
            type: "string" as const,
            description:
              "Primary name or identifier (e.g. APT28, CVE-2026-1731)",
          },
          aliases: {
            type: "array" as const,
            items: { type: "string" as const },
            description: "Alternative names for this entity",
          },
          cve_id: {
            type: "string" as const,
            description: "CVE identifier if this is a vulnerability",
          },
          cvss: {
            type: "number" as const,
            description: "CVSS score (0-10) if applicable",
          },
          severity: {
            type: "string" as const,
            enum: ["critical", "high", "medium", "low"],
            description: "Severity rating",
          },
          exploited_in_wild: {
            type: "boolean" as const,
            description: "Whether this vulnerability has known exploits in the wild",
          },
          affected_product: {
            type: "string" as const,
            description: "Product affected by this vulnerability",
          },
          country: {
            type: "string" as const,
            description: "Country of origin for threat actors",
          },
          motivation: {
            type: "string" as const,
            enum: ["espionage", "financial", "hacktivism", "destruction", "unknown"],
            description: "Motivation of the threat actor",
          },
          mitre_id: {
            type: "string" as const,
            description: "MITRE ATT&CK ID (e.g. T1566, G0007)",
          },
          malware_type: {
            type: "string" as const,
            description: "Type of malware (e.g. ransomware, infostealer, RAT)",
          },
          source_url: {
            type: "string" as const,
            description: "URL where this entity was discovered",
          },
        },
        required: ["type", "name"],
      },
    },
    iocs: {
      type: "array" as const,
      description: "Indicators of compromise found in source material",
      items: {
        type: "object" as const,
        properties: {
          type: {
            type: "string" as const,
            enum: ["ip", "domain", "hash_md5", "hash_sha256", "url", "email"],
            description: "Type of IOC",
          },
          value: {
            type: "string" as const,
            description: "The actual indicator value",
          },
          context: {
            type: "string" as const,
            description: "Context in which this IOC was found",
          },
        },
        required: ["type", "value"],
      },
    },
    relationships: {
      type: "array" as const,
      description: "Connections between entities",
      items: {
        type: "object" as const,
        properties: {
          source: {
            type: "string" as const,
            description: "Name of the source entity",
          },
          target: {
            type: "string" as const,
            description: "Name of the target entity",
          },
          relationship: {
            type: "string" as const,
            enum: [
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
            ],
            description: "Type of relationship",
          },
        },
        required: ["source", "target", "relationship"],
      },
    },
    threat_brief: {
      type: "object" as const,
      description: "High-level summary of findings",
      properties: {
        headline: {
          type: "string" as const,
          description: "One-line summary of the most important finding",
        },
        summary: {
          type: "string" as const,
          description: "2-3 sentence executive summary",
        },
        severity: {
          type: "string" as const,
          enum: ["critical", "high", "medium", "low"],
          description: "Overall severity of findings",
        },
      },
      required: ["headline", "summary", "severity"],
    },
    attack_techniques: {
      type: "array" as const,
      description: "MITRE ATT&CK techniques observed",
      items: {
        type: "object" as const,
        properties: {
          technique_id: {
            type: "string" as const,
            description: "MITRE ATT&CK technique ID (e.g. T1566)",
          },
          name: {
            type: "string" as const,
            description: "Technique name",
          },
          tactic: {
            type: "string" as const,
            description: "ATT&CK tactic category",
          },
          used_by: {
            type: "array" as const,
            items: { type: "string" as const },
            description: "Threat actors employing this technique",
          },
        },
        required: ["technique_id", "name"],
      },
    },
  },
  required: ["entities", "relationships", "threat_brief"],
};

// ---------------------------------------------------------------------------
// 2. OpenAI entity extraction schema (response_format: json_schema)
//    Used when we feed raw text (Tavily extracts, news articles) to GPT-4o
//    and need structured entity output.
// ---------------------------------------------------------------------------
export const entityExtractionSchema = {
  name: "entity_extraction",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      entities: {
        type: "array" as const,
        description: "Structured entities extracted from the input text",
        items: {
          type: "object" as const,
          properties: {
            type: {
              type: "string" as const,
              enum: [
                "ThreatActor",
                "Vulnerability",
                "Exploit",
                "Software",
                "Organization",
                "Malware",
                "Campaign",
                "AttackTechnique",
              ],
            },
            name: { type: "string" as const },
            cve_id: { type: ["string", "null"] as const },
            cvss: { type: ["number", "null"] as const },
            severity: {
              type: ["string", "null"] as const,
              enum: ["critical", "high", "medium", "low", null],
            },
            exploited_in_wild: { type: ["boolean", "null"] as const },
            affected_product: { type: ["string", "null"] as const },
            country: { type: ["string", "null"] as const },
            motivation: {
              type: ["string", "null"] as const,
              enum: [
                "espionage",
                "financial",
                "hacktivism",
                "destruction",
                "unknown",
                null,
              ],
            },
            mitre_id: { type: ["string", "null"] as const },
            malware_type: { type: ["string", "null"] as const },
            aliases: {
              type: "array" as const,
              items: { type: "string" as const },
            },
          },
          required: [
            "type",
            "name",
            "cve_id",
            "cvss",
            "severity",
            "exploited_in_wild",
            "affected_product",
            "country",
            "motivation",
            "mitre_id",
            "malware_type",
            "aliases",
          ],
          additionalProperties: false,
        },
      },
      relationships: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            source: { type: "string" as const },
            target: { type: "string" as const },
            relationship: {
              type: "string" as const,
              enum: [
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
              ],
            },
          },
          required: ["source", "target", "relationship"],
          additionalProperties: false,
        },
      },
      iocs: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            type: {
              type: "string" as const,
              enum: ["ip", "domain", "hash_md5", "hash_sha256", "url", "email"],
            },
            value: { type: "string" as const },
            context: { type: "string" as const },
          },
          required: ["type", "value", "context"],
          additionalProperties: false,
        },
      },
    },
    required: ["entities", "relationships", "iocs"],
    additionalProperties: false,
  },
};

// ---------------------------------------------------------------------------
// 3. OpenAI threat brief schema (response_format: json_schema)
//    Used when generating executive-level threat briefings from graph context.
// ---------------------------------------------------------------------------
export const threatBriefSchema = {
  name: "threat_brief",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      overall_threat_level: {
        type: "string" as const,
        enum: ["critical", "high", "elevated", "moderate", "low"],
      },
      headline: {
        type: "string" as const,
        description: "One-line headline for the briefing",
      },
      executive_summary: {
        type: "string" as const,
        description:
          "2-4 paragraph executive summary of the current threat landscape",
      },
      top_threats: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            threat: { type: "string" as const },
            severity: { type: "number" as const },
            affected_sectors: {
              type: "array" as const,
              items: { type: "string" as const },
            },
            recommended_action: { type: "string" as const },
          },
          required: [
            "threat",
            "severity",
            "affected_sectors",
            "recommended_action",
          ],
          additionalProperties: false,
        },
      },
      attack_paths_detected: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            from_actor: { type: "string" as const },
            through_vulnerability: { type: "string" as const },
            to_target: { type: "string" as const },
            risk_score: { type: "number" as const },
          },
          required: [
            "from_actor",
            "through_vulnerability",
            "to_target",
            "risk_score",
          ],
          additionalProperties: false,
        },
      },
      cisa_relevant: {
        type: "string" as const,
        description:
          "Analysis of how CISA workforce reductions affect the threat landscape covered in this brief",
      },
      recommended_actions: {
        type: "array" as const,
        items: { type: "string" as const },
      },
    },
    required: [
      "overall_threat_level",
      "headline",
      "executive_summary",
      "top_threats",
      "attack_paths_detected",
      "cisa_relevant",
      "recommended_actions",
    ],
    additionalProperties: false,
  },
};
