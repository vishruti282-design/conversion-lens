import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { capturePage } from "@/lib/capture";
import {
  analyzeVisualDesign,
  analyzeStructure,
  analyzeTrust,
  synthesizeReport,
} from "@/lib/gemini";
import {
  AnalyzeRequest,
  CampaignContext,
  DimensionResult,
  Report,
  ComparisonReport,
} from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const REPORTS_DIR = path.join(DATA_DIR, "reports");
const SCREENSHOTS_DIR = path.join(DATA_DIR, "screenshots");

async function ensureDirectories() {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

async function runAnalysisPipeline(
  url: string,
  campaignContext: CampaignContext
): Promise<{ report: Report; screenshot: string }> {
  const capture = await capturePage(url);

  const [visualDimensions, structureDimensions, trustDimensions] =
    await Promise.all([
      analyzeVisualDesign(capture.screenshot, campaignContext),
      analyzeStructure(capture.html, capture.textContent, campaignContext),
      analyzeTrust(capture.screenshot, capture.html, campaignContext),
    ]);

  const dimensions: DimensionResult[] = [
    ...visualDimensions,
    ...structureDimensions,
    ...trustDimensions,
  ];

  const synthesis = await synthesizeReport(dimensions, campaignContext);

  const totalScore = dimensions.reduce((sum, d) => sum + d.score, 0);
  const maxTotalScore = dimensions.reduce((sum, d) => sum + d.maxScore, 0);

  const report: Report = {
    id: uuidv4(),
    url,
    campaignContext,
    dimensions,
    synthesis,
    totalScore,
    maxTotalScore,
    createdAt: new Date().toISOString(),
  };

  return { report, screenshot: capture.screenshot };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalyzeRequest;

    if (!body.url || !isValidUrl(body.url)) {
      return NextResponse.json(
        { error: "A valid URL (http/https) is required." },
        { status: 400 }
      );
    }

    if (body.comparisonUrl && !isValidUrl(body.comparisonUrl)) {
      return NextResponse.json(
        { error: "Comparison URL must be a valid http/https URL." },
        { status: 400 }
      );
    }

    const campaignContext: CampaignContext = {
      trafficSource: body.trafficSource,
      campaignGoal: body.campaignGoal,
      targetAudience: body.targetAudience,
    };

    await ensureDirectories();

    // A/B comparison mode
    if (body.comparisonUrl) {
      const [resultA, resultB] = await Promise.all([
        runAnalysisPipeline(body.url, campaignContext),
        runAnalysisPipeline(body.comparisonUrl, campaignContext),
      ]);

      resultA.report.comparisonUrl = body.comparisonUrl;
      resultB.report.comparisonUrl = body.url;

      const comparison = await synthesizeReport(
        [...resultA.report.dimensions, ...resultB.report.dimensions],
        campaignContext
      );

      const comparisonReport: ComparisonReport = {
        id: uuidv4(),
        reportA: resultA.report,
        reportB: resultB.report,
        comparison,
        createdAt: new Date().toISOString(),
      };

      // Save all artifacts
      await Promise.all([
        fs.writeFile(
          path.join(REPORTS_DIR, `${comparisonReport.id}.json`),
          JSON.stringify(comparisonReport, null, 2)
        ),
        fs.writeFile(
          path.join(SCREENSHOTS_DIR, `${resultA.report.id}.png`),
          Buffer.from(resultA.screenshot, "base64")
        ),
        fs.writeFile(
          path.join(SCREENSHOTS_DIR, `${resultB.report.id}.png`),
          Buffer.from(resultB.screenshot, "base64")
        ),
      ]);

      return NextResponse.json(comparisonReport);
    }

    // Single analysis mode
    const { report, screenshot } = await runAnalysisPipeline(
      body.url,
      campaignContext
    );

    await Promise.all([
      fs.writeFile(
        path.join(REPORTS_DIR, `${report.id}.json`),
        JSON.stringify(report, null, 2)
      ),
      fs.writeFile(
        path.join(SCREENSHOTS_DIR, `${report.id}.png`),
        Buffer.from(screenshot, "base64")
      ),
    ]);

    return NextResponse.json(report);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    console.error("Analysis error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
