import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  CampaignContext,
  DimensionResult,
  Synthesis,
} from "./types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const SYSTEM_PREAMBLE = `You are a senior conversion rate optimization and design consultant with 30 years of experience analyzing landing pages. You combine deep expertise in UX design, copywriting, behavioral psychology, and web performance to provide actionable, evidence-based recommendations.`;

function parseGeminiJSON<T>(raw: string): T {
  const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
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

export async function analyzeVisualDesign(
  screenshotBase64: string,
  ctx?: CampaignContext
): Promise<DimensionResult[]> {
  const prompt = `${SYSTEM_PREAMBLE}

Analyze the provided landing page screenshot across these 3 dimensions:

1. **A1 - Visual Hierarchy** (max score: 15)
   Evaluate how effectively the page guides the eye. Consider F/Z-pattern compliance, whitespace usage, contrast ratios, size hierarchy, and visual flow.

2. **A2 - Typography** (max score: 10)
   Evaluate font choices, readability, line-height, letter-spacing, font pairing, heading hierarchy, and mobile readability.

3. **A3 - UI Consistency** (max score: 10)
   Evaluate design system consistency including color palette, spacing rhythm, component styling, icon consistency, and border treatments.

For each dimension, provide 2-4 findings with actionable recommendations.
${contextClause(ctx)}

Respond ONLY with valid JSON matching this exact schema — an array of 3 dimension objects:
[${DIMENSION_SCHEMA}]`;

  const result = await model.generateContent([
    { text: prompt },
    {
      inlineData: {
        mimeType: "image/png",
        data: screenshotBase64,
      },
    },
  ]);

  const text = result.response.text();
  return parseGeminiJSON<DimensionResult[]>(text);
}

export async function analyzeStructure(
  html: string,
  textContent: string,
  ctx?: CampaignContext
): Promise<DimensionResult[]> {
  const truncatedHtml = html.slice(0, 15000);
  const truncatedText = textContent.slice(0, 5000);

  const prompt = `${SYSTEM_PREAMBLE}

Analyze the provided landing page HTML and text content across these 4 dimensions:

1. **A4 - Accessibility** (max score: 15)
   Check semantic HTML, ARIA labels, alt text, heading structure, color contrast indicators, keyboard navigation potential, and form labels.

2. **B1 - Message Clarity** (max score: 15)
   Evaluate the headline, subheadline, value proposition clarity, benefit communication, jargon usage, and reading level.

3. **B3 - CTA Mechanics** (max score: 15)
   Evaluate CTA button text, placement, contrast, urgency, specificity, number of CTAs, and friction reduction.

4. **B4 - Content Strategy** (max score: 5)
   Evaluate content structure, scanability, bullet points, above-the-fold content density, and information hierarchy.

For each dimension, provide 2-4 findings with actionable recommendations.

PAGE HTML (truncated):
${truncatedHtml}

PAGE TEXT CONTENT (truncated):
${truncatedText}
${contextClause(ctx)}

Respond ONLY with valid JSON matching this exact schema — an array of 4 dimension objects:
[${DIMENSION_SCHEMA}]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return parseGeminiJSON<DimensionResult[]>(text);
}

export async function analyzeTrust(
  screenshotBase64: string,
  html: string,
  ctx?: CampaignContext
): Promise<DimensionResult[]> {
  const truncatedHtml = html.slice(0, 10000);

  const prompt = `${SYSTEM_PREAMBLE}

Analyze the provided landing page screenshot and HTML for trust and persuasion:

1. **B2 - Persuasion & Trust Architecture** (max score: 15)
   Evaluate social proof elements (testimonials, logos, reviews, stats), trust signals (security badges, guarantees, certifications), authority indicators, reciprocity elements, scarcity/urgency tactics, and overall trust architecture.

Provide 3-5 findings with actionable recommendations.

PAGE HTML (truncated):
${truncatedHtml}
${contextClause(ctx)}

Respond ONLY with valid JSON matching this exact schema — an array with 1 dimension object:
[${DIMENSION_SCHEMA}]`;

  const result = await model.generateContent([
    { text: prompt },
    {
      inlineData: {
        mimeType: "image/png",
        data: screenshotBase64,
      },
    },
  ]);

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

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return parseGeminiJSON<Synthesis>(text);
}
