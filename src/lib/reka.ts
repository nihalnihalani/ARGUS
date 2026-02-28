import type { VisualAnalysis } from "@/lib/types";

const BASE_URL = "https://api.reka.ai/v1/chat";
const FETCH_TIMEOUT_MS = 30_000;

function getApiKey(): string {
  const key = process.env.REKA_API_KEY;
  if (!key) {
    throw new Error("REKA_API_KEY is not set");
  }
  return key;
}

// ---- Core Vision API ----

/** Send an image + text prompt to Reka Flash and get raw text back. */
export async function analyzeImage(
  imageUrl: string,
  prompt: string
): Promise<string> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": getApiKey(),
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    body: JSON.stringify({
      model: "reka-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: imageUrl },
            { type: "text", text: prompt },
          ],
        },
      ],
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Reka API failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  // Reka uses "responses" not "choices"
  return data.responses?.[0]?.message?.content ?? data.choices?.[0]?.message?.content ?? "";
}

// ---- Specialized Analyzers ----

const PHISHING_PROMPT = `Analyze this webpage screenshot for phishing indicators. Check for: suspicious URLs, fake login forms, brand impersonation, urgency tactics, mismatched certificates, poor grammar. Return JSON: { isPhishing: boolean, confidence: number (0-1), indicators: string[], entitiesFound: [{ type, name }], riskLevel: "critical"|"high"|"medium"|"low"|"none", summary: string }`;

const FORUM_PROMPT = `Analyze this dark web forum screenshot. Extract: threat actors mentioned, malware names, CVE references, target organizations, attack techniques. Return JSON: { indicators: string[], entitiesFound: [{ type, name }], riskLevel: string, summary: string }`;

const MALWARE_PROMPT = `Analyze this screenshot of a suspected malware command and control panel. Identify: malware family, C2 indicators, victim statistics, campaign details. Return JSON: { indicators: string[], entitiesFound: [{ type, name }], riskLevel: string, summary: string }`;

/** Parse JSON from model response text, handling markdown fences. */
function parseJsonFromResponse(text: string): Record<string, unknown> | null {
  // Strip markdown code fences if present
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find a JSON object in the text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/** Default safe result when parsing fails. */
function defaultSafeResult(): {
  isPhishing: boolean;
  confidence: number;
  indicators: string[];
  entitiesFound: { type: string; name: string }[];
  riskLevel: "none";
  summary: string;
} {
  return {
    isPhishing: false,
    confidence: 0,
    indicators: [],
    entitiesFound: [],
    riskLevel: "none",
    summary: "Unable to parse analysis results",
  };
}

/** Analyze a webpage screenshot for phishing indicators. */
export async function analyzePhishingPage(screenshotUrl: string) {
  try {
    const raw = await analyzeImage(screenshotUrl, PHISHING_PROMPT);
    const parsed = parseJsonFromResponse(raw);
    if (!parsed) return defaultSafeResult();

    return {
      isPhishing: Boolean(parsed.isPhishing),
      confidence: Number(parsed.confidence) || 0,
      indicators: (parsed.indicators as string[]) ?? [],
      entitiesFound:
        (parsed.entitiesFound as { type: string; name: string }[]) ?? [],
      riskLevel: (parsed.riskLevel as string) ?? "none",
      summary: (parsed.summary as string) ?? "",
    };
  } catch (error) {
    console.error("[reka/analyzePhishingPage]", error);
    return defaultSafeResult();
  }
}

/** Analyze a dark web forum screenshot for threat intelligence. */
export async function analyzeForumScreenshot(screenshotUrl: string) {
  try {
    const raw = await analyzeImage(screenshotUrl, FORUM_PROMPT);
    const parsed = parseJsonFromResponse(raw);
    if (!parsed) return defaultSafeResult();

    return {
      isPhishing: false,
      confidence: 0,
      indicators: (parsed.indicators as string[]) ?? [],
      entitiesFound:
        (parsed.entitiesFound as { type: string; name: string }[]) ?? [],
      riskLevel: (parsed.riskLevel as string) ?? "none",
      summary: (parsed.summary as string) ?? "",
    };
  } catch (error) {
    console.error("[reka/analyzeForumScreenshot]", error);
    return defaultSafeResult();
  }
}

/** Analyze a malware C2 panel screenshot. */
export async function analyzeMalwareUI(screenshotUrl: string) {
  try {
    const raw = await analyzeImage(screenshotUrl, MALWARE_PROMPT);
    const parsed = parseJsonFromResponse(raw);
    if (!parsed) return defaultSafeResult();

    return {
      isPhishing: false,
      confidence: 0,
      indicators: (parsed.indicators as string[]) ?? [],
      entitiesFound:
        (parsed.entitiesFound as { type: string; name: string }[]) ?? [],
      riskLevel: (parsed.riskLevel as string) ?? "none",
      summary: (parsed.summary as string) ?? "",
    };
  } catch (error) {
    console.error("[reka/analyzeMalwareUI]", error);
    return defaultSafeResult();
  }
}

/** Auto-detect screenshot type and run the appropriate analyzer. */
export async function analyzeThreatScreenshot(
  screenshotUrl: string,
  context?: string
): Promise<VisualAnalysis> {
  try {
    // Step 1: classify the screenshot
    const classification = await analyzeImage(
      screenshotUrl,
      "What type of cybersecurity-relevant content is in this screenshot? Respond with one word: phishing, forum, malware, or general"
    );

    const type = classification.trim().toLowerCase();

    // Step 2: route to the correct analyzer
    let analysisType: VisualAnalysis["analysisType"];
    let result;

    if (type.includes("phishing")) {
      analysisType = "phishing";
      result = await analyzePhishingPage(screenshotUrl);
    } else if (type.includes("forum")) {
      analysisType = "forum";
      result = await analyzeForumScreenshot(screenshotUrl);
    } else if (type.includes("malware")) {
      analysisType = "malware";
      result = await analyzeMalwareUI(screenshotUrl);
    } else {
      // General: use context or a generic prompt
      analysisType = "general";
      const prompt = context
        ? `Analyze this cybersecurity-related screenshot. Context: ${context}. Return JSON: { indicators: string[], entitiesFound: [{ type, name }], riskLevel: "critical"|"high"|"medium"|"low"|"none", summary: string }`
        : `Analyze this cybersecurity-related screenshot. Identify any threat indicators, entities, or suspicious content. Return JSON: { indicators: string[], entitiesFound: [{ type, name }], riskLevel: "critical"|"high"|"medium"|"low"|"none", summary: string }`;

      try {
        const raw = await analyzeImage(screenshotUrl, prompt);
        const parsed = parseJsonFromResponse(raw);
        result = parsed
          ? {
              isPhishing: false,
              confidence: 0,
              indicators: (parsed.indicators as string[]) ?? [],
              entitiesFound:
                (parsed.entitiesFound as { type: string; name: string }[]) ??
                [],
              riskLevel: (parsed.riskLevel as string) ?? "none",
              summary: (parsed.summary as string) ?? "",
            }
          : defaultSafeResult();
      } catch {
        result = defaultSafeResult();
      }
    }

    return {
      imageUrl: screenshotUrl,
      analysisType,
      isPhishing: result.isPhishing,
      confidence: result.confidence,
      riskLevel: result.riskLevel as VisualAnalysis["riskLevel"],
      indicators: result.indicators,
      entitiesFound: result.entitiesFound,
      summary: result.summary,
      model: "reka-flash",
    };
  } catch (error) {
    console.error("[reka/analyzeThreatScreenshot]", error);
    const safe = defaultSafeResult();
    return {
      imageUrl: screenshotUrl,
      analysisType: "general",
      ...safe,
      model: "reka-flash",
    };
  }
}
