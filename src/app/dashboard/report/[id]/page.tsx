"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import type {
  Report,
  ComparisonReport,
  DimensionResult,
  Finding,
} from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  P0: { bg: "bg-p0Bg", text: "text-critical", label: "Critical" },
  P1: { bg: "bg-p1Bg", text: "text-warning", label: "High" },
  P2: { bg: "bg-p2Bg", text: "text-yellow-700", label: "Medium" },
  P3: { bg: "bg-p3Bg", text: "text-muted", label: "Low" },
};

const STATUS_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  critical: { border: "border-critical", bg: "bg-p0Bg", text: "text-critical" },
  warning: { border: "border-warning", bg: "bg-p1Bg", text: "text-warning" },
  success: { border: "border-success", bg: "bg-successBg", text: "text-success" },
};

const DIMENSION_ORDER = [
  "A1", "A2", "A3", "A4",
  "B1", "B2", "B3", "B4",
];

const DESIGN_IDS = new Set(["A1", "A2", "A3", "A4"]);

// ─── Utility Functions ────────────────────────────────────────────────────────

function getScoreColor(score: number, max: number): string {
  const pct = max > 0 ? score / max : 0;
  if (pct >= 0.9) return "text-brand";
  if (pct >= 0.75) return "text-success";
  if (pct >= 0.6) return "text-lime-600";
  if (pct >= 0.4) return "text-warning";
  return "text-critical";
}

function getScoreHexColor(score: number, max: number): string {
  const pct = max > 0 ? score / max : 0;
  if (pct >= 0.9) return "#2A9D8F";
  if (pct >= 0.75) return "#16A34A";
  if (pct >= 0.6) return "#65A30D";
  if (pct >= 0.4) return "#D97706";
  return "#DC2626";
}

function getGradeLabel(score: number, max: number): string {
  const pct = max > 0 ? score / max : 0;
  if (pct >= 0.9) return "Exceptional";
  if (pct >= 0.75) return "Strong";
  if (pct >= 0.6) return "Good";
  if (pct >= 0.4) return "Needs Work";
  return "Critical";
}

function groupDimensions(dims: DimensionResult[]): {
  design: DimensionResult[];
  conversion: DimensionResult[];
} {
  const sorted = [...dims].sort((a, b) => {
    const ai = DIMENSION_ORDER.indexOf(a.dimensionId);
    const bi = DIMENSION_ORDER.indexOf(b.dimensionId);
    return ai - bi;
  });
  return {
    design: sorted.filter((d) => DESIGN_IDS.has(d.dimensionId)),
    conversion: sorted.filter((d) => !DESIGN_IDS.has(d.dimensionId)),
  };
}

function getTopCriticalFindings(dims: DimensionResult[], count = 3): Finding[] {
  const all: Finding[] = [];
  for (const dim of dims) {
    for (const f of dim.findings) {
      if (f.status === "critical" || f.status === "warning") {
        all.push(f);
      }
    }
  }
  const priorityRank: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
  all.sort((a, b) => {
    const pa = priorityRank[a.priority] ?? 9;
    const pb = priorityRank[b.priority] ?? 9;
    if (pa !== pb) return pa - pb;
    const ra = a.maxScore > 0 ? a.score / a.maxScore : 0;
    const rb = b.maxScore > 0 ? b.score / b.maxScore : 0;
    return ra - rb;
  });
  return all.slice(0, count);
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function getCategoryScore(dims: DimensionResult[]): { score: number; max: number } {
  let score = 0;
  let max = 0;
  for (const d of dims) {
    score += d.score;
    max += d.maxScore;
  }
  return { score, max };
}

// ─── Inline SVG Icons ─────────────────────────────────────────────────────────

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="inline-block ml-1 -mt-0.5">
      <path d="M6 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1v-3M9 2h5v5M15 1L7.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckCircleIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className={className}>
      <circle cx="9" cy="9" r="9" fill="currentColor" />
      <path d="M5.5 9L8 11.5L12.5 6.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-warning">
      <path d="M8 21h8m-4-4v4m-4-8a4 4 0 018 0V6H8v7zM8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M5 6H3a1 1 0 00-1 1v2a4 4 0 004 4h0M19 6h2a1 1 0 011 1v2a4 4 0 01-4 4h0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonLoader() {
  return (
    <div className="px-6 py-12">
      <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
        {/* Header skeleton */}
        <div className="space-y-3">
          <div className="h-4 bg-dark/10 rounded w-64" />
          <div className="h-3 bg-dark/10 rounded w-40" />
        </div>
        {/* Score hero skeleton */}
        <div className="bg-surface rounded-xl p-8">
          <div className="flex items-center gap-8">
            <div className="w-28 h-28 rounded-full bg-dark/10" />
            <div className="flex-1 space-y-4">
              <div className="h-5 bg-dark/10 rounded w-32" />
              <div className="h-3 bg-dark/10 rounded w-full" />
              <div className="flex gap-4">
                <div className="h-8 bg-dark/10 rounded w-36" />
                <div className="h-8 bg-dark/10 rounded w-36" />
              </div>
            </div>
          </div>
        </div>
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface rounded-xl p-6 space-y-3">
            <div className="h-5 bg-dark/10 rounded w-32" />
            <div className="h-3 bg-dark/10 rounded w-full" />
            <div className="h-3 bg-dark/10 rounded w-3/4" />
          </div>
          <div className="bg-surface rounded-xl p-6 space-y-3">
            <div className="h-5 bg-dark/10 rounded w-32" />
            <div className="h-3 bg-dark/10 rounded w-full" />
            <div className="h-3 bg-dark/10 rounded w-3/4" />
          </div>
        </div>
        {/* Dimensions skeleton */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-surface rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="h-4 bg-dark/10 rounded w-8" />
              <div className="h-4 bg-dark/10 rounded w-40" />
              <div className="flex-1 h-2 bg-dark/10 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreHero({
  animatedScore,
  report,
  hasAnimated,
}: {
  animatedScore: number;
  report: Report;
  hasAnimated: boolean;
}) {
  const { design, conversion } = groupDimensions(report.dimensions);
  const designScore = getCategoryScore(design);
  const conversionScore = getCategoryScore(conversion);
  const pct = report.maxTotalScore > 0 ? report.totalScore / report.maxTotalScore : 0;

  return (
    <div className="bg-surface rounded-xl p-8">
      <div className="flex flex-col sm:flex-row items-center gap-8">
        {/* Score circle */}
        <div className="relative flex-shrink-0">
          <svg width="128" height="128" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r="56" fill="none" stroke="#E5E7EB" strokeWidth="8" />
            <circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke={getScoreHexColor(report.totalScore, report.maxTotalScore)}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 56}`}
              strokeDashoffset={`${2 * Math.PI * 56 * (1 - (hasAnimated ? pct : 0))}`}
              transform="rotate(-90 64 64)"
              style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.33, 1, 0.68, 1)" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold font-mono ${getScoreColor(report.totalScore, report.maxTotalScore)}`}>
              {animatedScore}
            </span>
            <span className="text-xs text-secondary">/ {report.maxTotalScore}</span>
          </div>
        </div>

        {/* Score details */}
        <div className="flex-1 space-y-4 text-center sm:text-left">
          <div>
            <span className={`text-lg font-semibold ${getScoreColor(report.totalScore, report.maxTotalScore)}`}>
              {getGradeLabel(report.totalScore, report.maxTotalScore)}
            </span>
          </div>

          {/* Spectrum bar */}
          <div className="space-y-1.5">
            <div className="relative h-2 rounded-full overflow-hidden bg-gradient-to-r from-critical via-warning via-50% to-success">
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-dark shadow-sm"
                style={{
                  left: `${(hasAnimated ? pct : 0) * 100}%`,
                  transition: "left 1.5s cubic-bezier(0.33, 1, 0.68, 1)",
                  transform: "translate(-50%, -50%)",
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-secondary">
              <span>Critical</span>
              <span>Exceptional</span>
            </div>
          </div>

          {/* Category sub-bars */}
          <div className="flex flex-col sm:flex-row gap-4">
            <CategoryBar label="Design" score={designScore.score} max={designScore.max} />
            <CategoryBar label="Conversion" score={conversionScore.score} max={conversionScore.max} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryBar({ label, score, max }: { label: string; score: number; max: number }) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  return (
    <div className="flex-1 space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-secondary font-medium">{label}</span>
        <span className={`font-mono font-semibold ${getScoreColor(score, max)}`}>{score}/{max}</span>
      </div>
      <div className="h-1.5 bg-dark/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: getScoreHexColor(score, max),
          }}
        />
      </div>
    </div>
  );
}

function StrengthsCard({ strengths, show }: { strengths: string[]; show: boolean }) {
  return (
    <div
      className="bg-surface rounded-xl p-6 border-l-4 border-success transition-all duration-500"
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(12px)",
      }}
    >
      <h3 className="font-heading italic text-xl text-dark mb-4">What&apos;s Working</h3>
      <div className="space-y-3">
        {strengths.slice(0, 3).map((s, i) => (
          <div key={i} className="flex items-start gap-3">
            <CheckCircleIcon className="text-success flex-shrink-0 mt-0.5" />
            <p className="text-sm text-secondary leading-relaxed">{s}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CriticalFixCard({
  finding,
  index,
  show,
}: {
  finding: Finding;
  index: number;
  show: boolean;
}) {
  const pStyle = PRIORITY_STYLES[finding.priority] || PRIORITY_STYLES.P2;
  const sColor = STATUS_COLORS[finding.status] || STATUS_COLORS.warning;

  return (
    <div
      className={`bg-surface rounded-xl p-6 border-l-4 ${sColor.border} transition-all duration-500`}
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(12px)",
        transitionDelay: `${index * 100}ms`,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h4 className="font-semibold text-dark text-sm">{finding.name}</h4>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${pStyle.bg} ${pStyle.text} flex-shrink-0`}>
          {finding.priority} &middot; {pStyle.label}
        </span>
      </div>
      <p className="text-sm text-secondary leading-relaxed mb-3">{finding.whatWeFound}</p>
      {finding.suggestedFix && (
        <div className="bg-brand/5 border border-brand/15 rounded-lg p-3 mb-3">
          <p className="text-xs font-medium text-brand mb-1">Suggested Fix</p>
          <p className="text-sm text-dark leading-relaxed">{finding.suggestedFix}</p>
        </div>
      )}
      <div className="flex gap-4 text-xs text-secondary">
        <span>Effort: <span className="font-medium text-dark">{finding.effort}</span></span>
        <span>Impact: <span className="font-medium text-dark">{finding.expectedImpact}</span></span>
      </div>
    </div>
  );
}

function DimensionAccordion({
  dimension,
  expanded,
  onToggle,
  show,
  delay,
}: {
  dimension: DimensionResult;
  expanded: boolean;
  onToggle: () => void;
  show: boolean;
  delay: number;
}) {
  const pct = dimension.maxScore > 0 ? (dimension.score / dimension.maxScore) * 100 : 0;
  const criticalCount = dimension.findings.filter((f) => f.status === "critical").length;
  const warningCount = dimension.findings.filter((f) => f.status === "warning").length;

  return (
    <div
      className="bg-surface rounded-xl overflow-hidden transition-all duration-500"
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(12px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-dark/[0.02] transition-colors"
      >
        <span className="font-mono text-xs text-secondary w-6">{dimension.dimensionId}</span>
        <span className="font-semibold text-dark text-sm flex-shrink-0">{dimension.dimensionName}</span>
        <div className="flex-1 mx-2">
          <div className="h-1.5 bg-dark/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                backgroundColor: getScoreHexColor(dimension.score, dimension.maxScore),
              }}
            />
          </div>
        </div>
        <span className={`font-mono text-sm font-semibold ${getScoreColor(dimension.score, dimension.maxScore)}`}>
          {dimension.score}/{dimension.maxScore}
        </span>
        <div className="flex gap-1.5 ml-1">
          {criticalCount > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-p0Bg text-critical">
              {criticalCount}
            </span>
          )}
          {warningCount > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-p1Bg text-warning">
              {warningCount}
            </span>
          )}
        </div>
        <ChevronIcon open={expanded} />
      </button>

      {/* Accordion body with grid-row animation */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 space-y-3 border-t border-dark/5 pt-4">
            {dimension.findings.map((finding) => (
              <FindingMiniCard key={finding.id} finding={finding} />
            ))}
            {dimension.findings.length === 0 && (
              <p className="text-sm text-secondary italic">No findings for this dimension.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FindingMiniCard({ finding }: { finding: Finding }) {
  const sColor = STATUS_COLORS[finding.status] || STATUS_COLORS.warning;
  const pStyle = PRIORITY_STYLES[finding.priority] || PRIORITY_STYLES.P2;

  return (
    <div className={`rounded-lg p-4 border-l-3 ${sColor.border} ${sColor.bg}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <h5 className="text-sm font-semibold text-dark">{finding.name}</h5>
        <div className="flex gap-1.5 flex-shrink-0">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${pStyle.bg} ${pStyle.text}`}>
            {finding.priority}
          </span>
          <span className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/60 ${getScoreColor(finding.score, finding.maxScore)}`}>
            {finding.score}/{finding.maxScore}
          </span>
        </div>
      </div>
      <p className="text-xs text-secondary leading-relaxed mb-2">{finding.whatWeFound}</p>
      <p className="text-xs text-secondary leading-relaxed"><span className="font-medium text-dark">Why it matters:</span> {finding.whyItMatters}</p>
      {finding.whatGoodLooksLike && (
        <p className="text-xs text-secondary leading-relaxed mt-1"><span className="font-medium text-dark">Good looks like:</span> {finding.whatGoodLooksLike}</p>
      )}
    </div>
  );
}

function ComparisonView({
  data,
  hasAnimated,
}: {
  data: ComparisonReport;
  hasAnimated: boolean;
}) {
  const [tab, setTab] = useState<"pageA" | "pageB" | "headToHead">("headToHead");

  const tabs: { key: "pageA" | "pageB" | "headToHead"; label: string }[] = [
    { key: "pageA", label: "Page A" },
    { key: "pageB", label: "Page B" },
    { key: "headToHead", label: "Head to Head" },
  ];

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 bg-dark/5 rounded-lg p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-white text-dark shadow-sm"
                : "text-secondary hover:text-dark"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "pageA" && (
        <SingleReportLayout report={data.reportA} hasAnimated={hasAnimated} />
      )}
      {tab === "pageB" && (
        <SingleReportLayout report={data.reportB} hasAnimated={hasAnimated} />
      )}
      {tab === "headToHead" && (
        <HeadToHead data={data} hasAnimated={hasAnimated} />
      )}
    </div>
  );
}

function HeadToHead({
  data,
  hasAnimated,
}: {
  data: ComparisonReport;
  hasAnimated: boolean;
}) {
  const a = data.reportA;
  const b = data.reportB;
  const aWins = a.totalScore > b.totalScore;
  const tie = a.totalScore === b.totalScore;

  return (
    <div className="space-y-6">
      {/* Winner banner */}
      {!tie && (
        <div className="bg-surface rounded-xl p-5 flex items-center gap-4">
          <TrophyIcon />
          <div>
            <p className="font-semibold text-dark text-sm">
              {aWins ? "Page A" : "Page B"} scores higher
            </p>
            <p className="text-xs text-secondary">
              {aWins ? a.url : b.url} — {Math.abs(a.totalScore - b.totalScore)} point advantage
            </p>
          </div>
        </div>
      )}

      {/* Side-by-side scores */}
      <div className="grid grid-cols-2 gap-4">
        <ComparisonScoreCard label="Page A" report={a} hasAnimated={hasAnimated} winner={aWins && !tie} />
        <ComparisonScoreCard label="Page B" report={b} hasAnimated={hasAnimated} winner={!aWins && !tie} />
      </div>

      {/* Dimension comparison */}
      <div className="space-y-3">
        <h3 className="font-heading italic text-xl text-dark">Dimension Comparison</h3>
        {DIMENSION_ORDER.map((dimId) => {
          const dimA = a.dimensions.find((d) => d.dimensionId === dimId);
          const dimB = b.dimensions.find((d) => d.dimensionId === dimId);
          if (!dimA && !dimB) return null;
          const maxScore = dimA?.maxScore || dimB?.maxScore || 1;
          const scoreA = dimA?.score || 0;
          const scoreB = dimB?.score || 0;
          const name = dimA?.dimensionName || dimB?.dimensionName || dimId;
          return (
            <div key={dimId} className="bg-surface rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-dark">
                  <span className="font-mono text-xs text-secondary mr-2">{dimId}</span>
                  {name}
                </span>
                <span className="font-mono text-xs text-secondary">max {maxScore}</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className={`font-mono text-xs font-semibold w-8 text-right ${getScoreColor(scoreA, maxScore)}`}>{scoreA}</span>
                <div className="flex-1 flex h-2 gap-0.5">
                  <div className="flex-1 bg-dark/10 rounded-l-full overflow-hidden">
                    <div
                      className="h-full rounded-l-full"
                      style={{
                        width: `${maxScore > 0 ? (scoreA / maxScore) * 100 : 0}%`,
                        backgroundColor: getScoreHexColor(scoreA, maxScore),
                      }}
                    />
                  </div>
                  <div className="flex-1 bg-dark/10 rounded-r-full overflow-hidden flex justify-end">
                    <div
                      className="h-full rounded-r-full"
                      style={{
                        width: `${maxScore > 0 ? (scoreB / maxScore) * 100 : 0}%`,
                        backgroundColor: getScoreHexColor(scoreB, maxScore),
                      }}
                    />
                  </div>
                </div>
                <span className={`font-mono text-xs font-semibold w-8 ${getScoreColor(scoreB, maxScore)}`}>{scoreB}</span>
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-secondary">
                <span>Page A</span>
                <span>Page B</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison synthesis */}
      {data.comparison && (
        <div className="bg-surface rounded-xl p-6 space-y-4">
          <h3 className="font-heading italic text-xl text-dark">Comparison Summary</h3>
          <p className="text-sm text-secondary leading-relaxed">{data.comparison.overview}</p>
        </div>
      )}
    </div>
  );
}

function ComparisonScoreCard({
  label,
  report,
  hasAnimated,
  winner,
}: {
  label: string;
  report: Report;
  hasAnimated: boolean;
  winner: boolean;
}) {
  const pct = report.maxTotalScore > 0 ? report.totalScore / report.maxTotalScore : 0;
  return (
    <div className={`bg-surface rounded-xl p-5 text-center ${winner ? "ring-2 ring-brand" : ""}`}>
      {winner && (
        <span className="inline-block text-[10px] font-semibold text-brand bg-brand/10 px-2 py-0.5 rounded-full mb-2">Winner</span>
      )}
      <p className="text-xs text-secondary mb-1 font-medium">{label}</p>
      <p className="text-xs text-secondary truncate mb-3" title={report.url}>{report.url}</p>
      <div className="relative mx-auto w-20 h-20">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="34" fill="none" stroke="#E5E7EB" strokeWidth="6" />
          <circle
            cx="40" cy="40" r="34" fill="none"
            stroke={getScoreHexColor(report.totalScore, report.maxTotalScore)}
            strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 34}`}
            strokeDashoffset={`${2 * Math.PI * 34 * (1 - (hasAnimated ? pct : 0))}`}
            transform="rotate(-90 40 40)"
            style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.33, 1, 0.68, 1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-xl font-bold font-mono ${getScoreColor(report.totalScore, report.maxTotalScore)}`}>
            {report.totalScore}
          </span>
          <span className="text-[9px] text-secondary">/ {report.maxTotalScore}</span>
        </div>
      </div>
      <p className={`text-sm font-semibold mt-2 ${getScoreColor(report.totalScore, report.maxTotalScore)}`}>
        {getGradeLabel(report.totalScore, report.maxTotalScore)}
      </p>
    </div>
  );
}

function SingleReportLayout({
  report,
  hasAnimated,
}: {
  report: Report;
  hasAnimated: boolean;
}) {
  const [expandedDimensions, setExpandedDimensions] = useState<Set<string>>(new Set());
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    if (!hasAnimated) return;
    const duration = 1500;
    const start = performance.now();
    let raf: number;
    function tick(now: number) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      setAnimatedScore(Math.round(easeOutCubic(t) * report.totalScore));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hasAnimated, report.totalScore]);

  const toggleDimension = (id: string) => {
    setExpandedDimensions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { design, conversion } = groupDimensions(report.dimensions);
  const criticalFindings = getTopCriticalFindings(report.dimensions);

  return (
    <div className="space-y-8">
      <ScoreHero animatedScore={animatedScore} report={report} hasAnimated={hasAnimated} />

      {report.synthesis.strengths.length > 0 && (
        <StrengthsCard strengths={report.synthesis.strengths} show={hasAnimated} />
      )}

      {criticalFindings.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-heading italic text-xl text-dark">Top Critical Fixes</h3>
          {criticalFindings.map((f, i) => (
            <CriticalFixCard key={f.id} finding={f} index={i} show={hasAnimated} />
          ))}
        </div>
      )}

      {/* Dimension groups */}
      {design.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider">Design</h3>
          {design.map((d, i) => (
            <DimensionAccordion
              key={d.dimensionId}
              dimension={d}
              expanded={expandedDimensions.has(d.dimensionId)}
              onToggle={() => toggleDimension(d.dimensionId)}
              show={hasAnimated}
              delay={i * 60}
            />
          ))}
        </div>
      )}
      {conversion.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider">Conversion</h3>
          {conversion.map((d, i) => (
            <DimensionAccordion
              key={d.dimensionId}
              dimension={d}
              expanded={expandedDimensions.has(d.dimensionId)}
              onToggle={() => toggleDimension(d.dimensionId)}
              show={hasAnimated}
              delay={(design.length + i) * 60}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Export ───────────────────────────────────────────────────────────────

type PageState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "single"; report: Report }
  | { kind: "comparison"; data: ComparisonReport };

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [state, setState] = useState<PageState>({ kind: "loading" });
  const [animatedScore, setAnimatedScore] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [expandedDimensions, setExpandedDimensions] = useState<Set<string>>(new Set());

  // Fetch report
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/reports/${id}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Failed to load report (${res.status})`);
        }
        const data = await res.json();
        if (cancelled) return;

        // Detect comparison vs single
        if (data.reportA) {
          setState({ kind: "comparison", data: data as ComparisonReport });
        } else {
          setState({ kind: "single", report: data as Report });
        }
      } catch (err) {
        if (cancelled) return;
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Something went wrong",
        });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Score animation for single report
  useEffect(() => {
    if (state.kind !== "single") return;
    const target = state.report.totalScore;
    const duration = 1500;
    const start = performance.now();
    let raf: number;

    function tick(now: number) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      setAnimatedScore(Math.round(easeOutCubic(t) * target));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setHasAnimated(true);
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state.kind === "single" ? state.report.totalScore : null]); // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger hasAnimated for comparison mode
  useEffect(() => {
    if (state.kind !== "comparison") return;
    const timer = setTimeout(() => setHasAnimated(true), 100);
    return () => clearTimeout(timer);
  }, [state.kind]);

  const toggleDimension = useCallback((dimId: string) => {
    setExpandedDimensions((prev) => {
      const next = new Set(prev);
      if (next.has(dimId)) next.delete(dimId);
      else next.add(dimId);
      return next;
    });
  }, []);

  // Loading
  if (state.kind === "loading") {
    return <SkeletonLoader />;
  }

  // Error
  if (state.kind === "error") {
    return (
      <div className="px-6 py-16">
        <div className="max-w-[520px] mx-auto">
          <div className="bg-surface rounded-xl p-8 space-y-6 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-critical/10 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-critical">
                <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="font-heading italic text-2xl text-dark">Report not found</h2>
              <p className="text-secondary text-sm leading-relaxed">{state.message}</p>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-brand text-white font-semibold py-3 px-6 rounded-lg transition-colors hover:bg-brand/90"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Comparison mode
  if (state.kind === "comparison") {
    return (
      <div className="px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Back nav */}
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1.5 text-sm text-secondary hover:text-dark transition-colors"
          >
            <ArrowLeftIcon /> Back to dashboard
          </button>

          {/* Header */}
          <div className="space-y-2">
            <h1 className="font-heading italic text-3xl text-dark">A/B Comparison Report</h1>
            <p className="text-secondary text-sm">
              Analyzed {new Date(state.data.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>

          <ComparisonView data={state.data} hasAnimated={hasAnimated} />

          {/* Footer actions */}
          <div className="flex flex-wrap gap-3 pt-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-brand text-white font-semibold py-2.5 px-5 rounded-lg text-sm transition-colors hover:bg-brand/90"
            >
              Analyze Another Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Single report
  const report = state.report;
  const { design, conversion } = groupDimensions(report.dimensions);
  const criticalFindings = getTopCriticalFindings(report.dimensions);

  const contextPills = [
    report.campaignContext.trafficSource,
    report.campaignContext.campaignGoal,
    report.campaignContext.targetAudience,
  ].filter(Boolean);

  return (
    <div className="px-6 py-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Back nav */}
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 text-sm text-secondary hover:text-dark transition-colors"
        >
          <ArrowLeftIcon /> Back to dashboard
        </button>

        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="font-heading italic text-3xl text-dark flex items-center gap-2 flex-wrap">
            <a
              href={report.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand transition-colors break-all"
            >
              {report.url}
              <ExternalLinkIcon />
            </a>
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-secondary text-sm">
              Analyzed {new Date(report.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
            {contextPills.map((pill) => (
              <span
                key={pill}
                className="text-[11px] font-medium text-secondary bg-dark/5 px-2.5 py-1 rounded-full"
              >
                {pill}
              </span>
            ))}
          </div>
        </div>

        {/* Score Hero */}
        <ScoreHero animatedScore={animatedScore} report={report} hasAnimated={hasAnimated} />

        {/* Overview */}
        {report.synthesis.overview && (
          <div
            className="bg-surface rounded-xl p-6 transition-all duration-500"
            style={{
              opacity: hasAnimated ? 1 : 0,
              transform: hasAnimated ? "translateY(0)" : "translateY(12px)",
            }}
          >
            <p className="text-sm text-secondary leading-relaxed">{report.synthesis.overview}</p>
          </div>
        )}

        {/* What's Working */}
        {report.synthesis.strengths.length > 0 && (
          <StrengthsCard strengths={report.synthesis.strengths} show={hasAnimated} />
        )}

        {/* Top 3 Critical Fixes */}
        {criticalFindings.length > 0 && (
          <div
            className="space-y-4 transition-all duration-500"
            style={{
              opacity: hasAnimated ? 1 : 0,
              transform: hasAnimated ? "translateY(0)" : "translateY(12px)",
              transitionDelay: "100ms",
            }}
          >
            <h3 className="font-heading italic text-xl text-dark">Top Critical Fixes</h3>
            {criticalFindings.map((f, i) => (
              <CriticalFixCard key={f.id} finding={f} index={i} show={hasAnimated} />
            ))}
          </div>
        )}

        {/* Detailed Analysis - Design */}
        {design.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider">Design</h3>
            {design.map((d, i) => (
              <DimensionAccordion
                key={d.dimensionId}
                dimension={d}
                expanded={expandedDimensions.has(d.dimensionId)}
                onToggle={() => toggleDimension(d.dimensionId)}
                show={hasAnimated}
                delay={i * 60}
              />
            ))}
          </div>
        )}

        {/* Detailed Analysis - Conversion */}
        {conversion.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider">Conversion</h3>
            {conversion.map((d, i) => (
              <DimensionAccordion
                key={d.dimensionId}
                dimension={d}
                expanded={expandedDimensions.has(d.dimensionId)}
                onToggle={() => toggleDimension(d.dimensionId)}
                show={hasAnimated}
                delay={(design.length + i) * 60}
              />
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div
          className="flex flex-wrap gap-3 pt-4 border-t border-dark/10 transition-all duration-500"
          style={{
            opacity: hasAnimated ? 1 : 0,
            transitionDelay: "300ms",
          }}
        >
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-brand text-white font-semibold py-2.5 px-5 rounded-lg text-sm transition-colors hover:bg-brand/90"
          >
            Analyze Another Page
          </button>
          <button className="border border-dark/15 text-dark font-semibold py-2.5 px-5 rounded-lg text-sm transition-colors hover:bg-dark/5">
            Download Summary PDF
          </button>
          <button className="border border-dark/15 text-dark font-semibold py-2.5 px-5 rounded-lg text-sm transition-colors hover:bg-dark/5">
            Download Full Report PDF
          </button>
        </div>
      </div>
    </div>
  );
}
