import OpenAI from "openai";
import { entityExtractionSchema, threatBriefSchema } from "./schema";

const openai = new OpenAI();

/** Extract structured threat entities from raw text using GPT-4o. */
export async function extractEntities(rawText: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a cybersecurity threat intelligence analyst. Extract all threat entities, relationships, and IOCs from the provided text. Be thorough — identify threat actors, vulnerabilities (with CVE IDs and CVSS if mentioned), exploits, affected software, organizations, malware, campaigns, and MITRE ATT&CK techniques. For each relationship, specify how entities connect (USES, TARGETS, AFFECTS, DEPLOYS, EXPLOITS, ATTRIBUTED_TO, EMPLOYS_TECHNIQUE, etc.).`,
      },
      {
        role: "user",
        content: rawText,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: entityExtractionSchema,
    },
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty response");
  return JSON.parse(content) as {
    entities: {
      type: string;
      name: string;
      cve_id?: string | null;
      cvss?: number | null;
      severity?: string | null;
      exploited_in_wild?: boolean | null;
      affected_product?: string | null;
      country?: string | null;
      motivation?: string | null;
      mitre_id?: string | null;
      malware_type?: string | null;
      aliases?: string[];
    }[];
    relationships: {
      source: string;
      target: string;
      relationship: string;
    }[];
    iocs: {
      type: string;
      value: string;
      context: string;
    }[];
  };
}

/** Generate an executive threat briefing from graph context + new findings. */
export async function generateThreatBrief(
  graphContext: string,
  newFindings: string
) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a senior cybersecurity analyst generating an executive threat briefing. Context: In February 2026, CISA (Cybersecurity and Infrastructure Security Agency) lost most of its workforce due to government restructuring. Proactive threat scanning and vulnerability coordination has been severely impacted. Your briefing should reference this gap and emphasize the importance of autonomous monitoring.

Generate a concise, actionable briefing based on the current knowledge graph state and new findings. Prioritize critical vulnerabilities with known exploits, active threat actor campaigns, and attack paths to high-value targets.`,
      },
      {
        role: "user",
        content: `CURRENT KNOWLEDGE GRAPH STATE:\n${graphContext}\n\nNEW FINDINGS:\n${newFindings}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: threatBriefSchema,
    },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty response");
  return JSON.parse(content);
}

/** Generate a vector embedding for semantic similarity searches. */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: text,
    dimensions: 256,
  });
  return response.data[0].embedding;
}

/** Use function calling to let GPT-4o autonomously decide which tools to invoke. */
export async function classifyThreat(description: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are a threat intelligence triage system. Analyze the threat description and decide which enrichment actions to take.",
      },
      {
        role: "user",
        content: description,
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "search_cve",
          description:
            "Search for a CVE in vulnerability databases to get CVSS score and affected products",
          parameters: {
            type: "object",
            properties: {
              cve_id: {
                type: "string",
                description: "The CVE identifier (e.g. CVE-2026-1731)",
              },
            },
            required: ["cve_id"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "investigate_ip",
          description:
            "Perform WHOIS lookup and geolocation on a suspicious IP address",
          parameters: {
            type: "object",
            properties: {
              ip: {
                type: "string",
                description: "The IP address to investigate",
              },
            },
            required: ["ip"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "research_actor",
          description:
            "Deep research on a threat actor group including TTPs, recent campaigns, and known infrastructure",
          parameters: {
            type: "object",
            properties: {
              actor_name: {
                type: "string",
                description: "Name of the threat actor (e.g. APT28, Lazarus)",
              },
            },
            required: ["actor_name"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "enrich_malware",
          description:
            "Look up malware sample details, IOCs, and related campaigns",
          parameters: {
            type: "object",
            properties: {
              malware_name: {
                type: "string",
                description: "Name of the malware (e.g. PromptSpy)",
              },
            },
            required: ["malware_name"],
          },
        },
      },
    ],
    tool_choice: "auto",
  });

  return {
    message: response.choices[0]?.message,
    toolCalls: response.choices[0]?.message?.tool_calls ?? [],
  };
}
