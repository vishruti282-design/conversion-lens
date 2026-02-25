import { NextResponse } from "next/server";
import { capturePage } from "@/lib/capture";
import {
  analyzeVisualDesign,
  analyzeStructure,
  analyzeTrust,
  synthesizeReport,
  sleep,
  GEMINI_DELAY_MS,
} from "@/lib/gemini";
import { DimensionResult } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // allow up to 2 min for the full pipeline

export async function GET() {
  const url = "https://stripe.com";
  const log: string[] = [];
  const timings: Record<string, number> = {};

  try {
    // Step 1: Capture
    log.push(`[1/4] Capturing ${url} ...`);
    const t0 = Date.now();
    const capture = await capturePage(url);
    timings.capture = Date.now() - t0;
    log.push(
      `  ✓ Captured in ${timings.capture}ms — ` +
        `screenshot ${Math.round(capture.screenshot.length / 1024)}KB base64, ` +
        `HTML ${Math.round(capture.html.length / 1024)}KB, ` +
        `text ${Math.round(capture.textContent.length / 1024)}KB`
    );

    // Step 2: Sequential Gemini analysis (rate-limit safe)
    log.push(`[2/4] Sending to Gemini (3 sequential calls) ...`);
    const t1 = Date.now();
    const visual = await analyzeVisualDesign(capture.screenshot);
    await sleep(GEMINI_DELAY_MS);
    const structure = await analyzeStructure(capture.html, capture.textContent);
    await sleep(GEMINI_DELAY_MS);
    const trust = await analyzeTrust(capture.screenshot, capture.html);
    timings.analysis = Date.now() - t1;
    log.push(`  ✓ Analysis complete in ${timings.analysis}ms`);

    const dimensions: DimensionResult[] = [...visual, ...structure, ...trust];

    // Step 3: Synthesis
    log.push(`[3/4] Synthesizing report ...`);
    await sleep(GEMINI_DELAY_MS);
    const t2 = Date.now();
    const synthesis = await synthesizeReport(dimensions);
    timings.synthesis = Date.now() - t2;
    log.push(`  ✓ Synthesis complete in ${timings.synthesis}ms`);

    // Step 4: Build results
    const totalScore = dimensions.reduce((s, d) => s + d.score, 0);
    const maxScore = dimensions.reduce((s, d) => s + d.maxScore, 0);
    timings.total = Date.now() - t0;

    log.push(`[4/4] Done in ${timings.total}ms total`);
    log.push("");
    log.push(`=== SCORE: ${totalScore} / ${maxScore} ===`);

    return NextResponse.json({
      success: true,
      url,
      score: `${totalScore}/${maxScore}`,
      timings,
      log,
      dimensions: dimensions.map((d) => ({
        name: d.dimensionName,
        score: `${d.score}/${d.maxScore}`,
        findings: d.findings.length,
      })),
      synthesis,
      fullDimensions: dimensions,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    log.push(`✗ ERROR: ${message}`);

    return NextResponse.json(
      { success: false, log, error: message },
      { status: 500 }
    );
  }
}
