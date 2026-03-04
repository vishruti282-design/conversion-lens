import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  CampaignContext,
  DimensionResult,
  Synthesis,
} from "./types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export const GEMINI_DELAY_MS = 500;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(
  content: Parameters<typeof model.generateContent>[0]
) {
  try {
    return await model.generateContent(content);
  } catch (error: unknown) {
    const status =
      error instanceof Error && "status" in error
        ? (error as { status: number }).status
        : undefined;
    const msg = error instanceof Error ? error.message : String(error);

    if (status === 429 || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
      console.warn("Gemini 429 rate limit hit — waiting 60s before retry…");
      await sleep(60000);
      return await model.generateContent(content);
    }
    throw error;
  }
}

const SYSTEM_PREAMBLE = `You are a senior conversion rate optimization and design consultant with 30 years of experience analyzing landing pages. You combine deep expertise in UX design, copywriting, behavioral psychology, and web performance to provide actionable, evidence-based recommendations.`;

function parseGeminiJSON<T>(raw: string): T {
  // Strip markdown code fences
  let cleaned = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  // Extract the first complete JSON array or object
  const start = cleaned.indexOf("[") !== -1 && (cleaned.indexOf("{") === -1 || cleaned.indexOf("[") < cleaned.indexOf("{"))
    ? cleaned.indexOf("[")
    : cleaned.indexOf("{");
  if (start > 0) cleaned = cleaned.slice(start);
  // Find matching closing bracket
  const openChar = cleaned[0];
  const closeChar = openChar === "[" ? "]" : "}";
  let depth = 0;
  let end = -1;
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === openChar) depth++;
    else if (cleaned[i] === closeChar) depth--;
    if (depth === 0) { end = i; break; }
  }
  if (end !== -1) cleaned = cleaned.slice(0, end + 1);
  return JSON.parse(cleaned) as T;
}

function contextClause(ctx?: CampaignContext): string {
  if (!ctx) return "";
  const parts: string[] = [];
  if (ctx.trafficSource) parts.push(`Traffic source: ${ctx.trafficSource}`);
  if (ctx.campaignGoal) parts.push(`Campaign goal: ${ctx.campaignGoal}`);
  if (ctx.targetAudience) parts.push(`Target audience: ${ctx.targetAudience}`);
  if (parts.length === 0) return "";
  return `\n\nCampaign Context:\n${parts.join("\n")}`;
}

const DIMENSION_SCHEMA = `{
  "dimensionId": "string",
  "dimensionName": "string",
  "score": number,
  "maxScore": number,
  "subScores": [
    { "id": "string", "name": "string", "score": number, "maxScore": number }
  ],
  "findings": [
    {
      "id": "string",
      "name": "string",
      "status": "critical" | "warning" | "success",
      "priority": "P0" | "P1" | "P2" | "P3",
      "score": number,
      "maxScore": number,
      "whatWeFound": "string",
      "whyItMatters": "string",
      "whatGoodLooksLike": "string",
      "suggestedFix": "string",
      "effort": "string",
      "expectedImpact": "string"
    }
  ]
}`;

const SYNTHESIS_SCHEMA = `{
  "overview": "string (2-3 sentence narrative summary)",
  "strengths": ["string", "string", "string"],
  "criticalFixes": ["string", "string", "string"],
  "actionPlan": ["string (prioritized action items)"]
}`;

/**
 * Single Gemini call that analyzes all 8 dimensions at once.
 * Accepts screenshot (optional) + HTML + text content.
 */
export async function analyzeAll(
  screenshotBase64: string,
  html: string,
  textContent: string,
  ctx?: CampaignContext
): Promise<DimensionResult[]> {
  const truncatedHtml = html.slice(0, 15000);
  const truncatedText = textContent.slice(0, 5000);

  const prompt = `${SYSTEM_PREAMBLE}

Analyze the provided landing page across ALL 8 dimensions below. You are given ${screenshotBase64 ? "a screenshot, " : ""}the page HTML, and extracted text content.

**Design Dimensions:**

1. **A1 - Visual Hierarchy** (max score: 15)
   Evaluate how effectively the page guides the eye. Consider F/Z-pattern compliance, whitespace usage, contrast ratios, size hierarchy, and visual flow.

2. **A2 - Typography** (max score: 10)
   Evaluate font choices, readability, line-height, letter-spacing, font pairing, heading hierarchy, and mobile readability.

3. **A3 - UI Consistency** (max score: 10)
   Evaluate design system consistency including color palette, spacing rhythm, component styling, icon consistency, and border treatments.

4. **A4 - Accessibility** (max score: 15)
   Check semantic HTML, ARIA labels, alt text, heading structure, color contrast indicators, keyboard navigation potential, and form labels.

**Conversion Dimensions:**

5. **B1 - Message Clarity** (max score: 15)
   Evaluate the headline, subheadline, value proposition clarity, benefit communication, jargon usage, and reading level.

6. **B2 - Persuasion & Trust Architecture** (max score: 15)
   Evaluate social proof elements (testimonials, logos, reviews, stats), trust signals (security badges, guarantees, certifications), authority indicators, reciprocity elements, scarcity/urgency tactics, and overall trust architecture.

7. **B3 - CTA Mechanics** (max score: 15)
   Evaluate CTA button text, placement, contrast, urgency, specificity, number of CTAs, and friction reduction.

8. **B4 - Content Strategy** (max score: 5)
   Evaluate content structure, scanability, bullet points, above-the-fold content density, and information hierarchy.

For each dimension, provide 2-4 findings with actionable recommendations.

PAGE HTML (truncated):
${truncatedHtml}

PAGE TEXT CONTENT (truncated):
${truncatedText}
${contextClause(ctx)}

Respond ONLY with valid JSON matching this exact schema — an array of 8 dimension objects:
[${DIMENSION_SCHEMA}]`;

  const content: Parameters<typeof callGemini>[0] = screenshotBase64
    ? [
        { text: prompt },
        { inlineData: { mimeType: "image/png", data: screenshotBase64 } },
      ]
    : prompt;

  const result = await callGemini(content);
  const text = result.response.text();
  return parseGeminiJSON<DimensionResult[]>(text);
}

export async function synthesizeReport(
  dimensions: DimensionResult[],
  ctx?: CampaignContext
): Promise<Synthesis> {
  const summary = dimensions.map((d) => {
    const findingSummary = d.findings
      .map((f) => `- [${f.status}/${f.priority}] ${f.name}: ${f.whatWeFound}`)
      .join("\n");
    return `## ${d.dimensionName} (${d.score}/${d.maxScore})\n${findingSummary}`;
  }).join("\n\n");

  const totalScore = dimensions.reduce((sum, d) => sum + d.score, 0);
  const maxScore = dimensions.reduce((sum, d) => sum + d.maxScore, 0);

  const prompt = `${SYSTEM_PREAMBLE}

You have just completed an 8-dimension analysis of a landing page. Here are the results:

Overall Score: ${totalScore}/${maxScore}

${summary}
${contextClause(ctx)}

Synthesize these findings into an executive summary. Identify the 3 most impactful strengths, the 3 most critical fixes needed, and a prioritized action plan ordered by expected impact.

Respond ONLY with valid JSON matching this exact schema:
${SYNTHESIS_SCHEMA}`;

  const result = await callGemini(prompt);
  const text = result.response.text();
  return parseGeminiJSON<Synthesis>(text);
}
