"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Report, DimensionResult, Finding } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<
  string,
  { bg: string; text: string; label: string; tierLabel: string }
> = {
  P0: { bg: "bg-p0Bg", text: "text-critical", label: "Critical Issue", tierLabel: "P0 — Fix Immediately" },
  P1: { bg: "bg-p1Bg", text: "text-warning", label: "Warning", tierLabel: "P1 — Fix Soon" },
  P2: { bg: "bg-p2Bg", text: "text-yellow-700", label: "Warning", tierLabel: "P2 — When Possible" },
  P3: { bg: "bg-p3Bg", text: "text-muted", label: "Low Priority", tierLabel: "P3 — Nice to Have" },
};

const STATUS_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  critical: { border: "border-critical", bg: "bg-p0Bg", text: "text-critical" },
  warning: { border: "border-warning", bg: "bg-p1Bg", text: "text-warning" },
  success: { border: "border-success", bg: "bg-successBg", text: "text-success" },
};

const DIMENSION_ORDER = ["A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4"];

const DESIGN_IDS = new Set(["A1", "A2", "A3", "A4"]);

const DIMENSION_DESCRIPTIONS: Record<string, string> = {
  A1: "Visual hierarchy and composition evaluates how effectively the page guides the viewer\u2019s eye through content using size, contrast, spacing, and layout structure.",
  A2: "Typography and readability assesses font choices, sizing, line spacing, and overall text presentation for clarity and brand consistency.",
  A3: "UI consistency examines the coherence of design patterns, component styling, and visual language across the page.",
  A4: "Accessibility reviews color contrast, interactive element sizing, alt text, and other factors that affect usability for all users.",
  B1: "Message clarity evaluates whether the page communicates its value proposition quickly and effectively to visitors.",
  B2: "Persuasion and trust assesses the use of social proof, credibility signals, and psychological triggers that influence conversion.",
  B3: "CTA mechanics examines call-to-action placement, design, copy, and the friction in the conversion pathway.",
  B4: "Content strategy evaluates information architecture, content prioritization, and how well the narrative supports the conversion goal.",
};

const PRIORITY_TIER_CONFIG: {
  key: string;
  label: string;
  priorities: string[];
  borderColor: string;
}[] = [
  { key: "immediate", label: "Immediate — fix this week", priorities: ["P0"], borderColor: "border-critical" },
  { key: "soon", label: "Soon — next 2 weeks", priorities: ["P1"], borderColor: "border-warning" },
  { key: "when-possible", label: "When possible", priorities: ["P2", "P3"], borderColor: "border-yellow-400" },
];

const NAV_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "design", label: "Design Analysis" },
  { id: "conversion", label: "Conversion Analysis" },
  { id: "action-plan", label: "Action Plan" },
];

// ─── Utility Functions ────────────────────────────────────────────────────────

function getScoreColor(score: number, max: number): string {
  const pct = max > 0 ? score / max : 0;
  if (pct >= 0.9) return "text-brand";
  if (pct >= 0.75) return "text-success";
  if (pct >= 0.6) return "text-lime-600";
  if (pct >= 0.4) return "text-warning";
  return "text-critical";
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

function groupFindingsByPriority(dims: DimensionResult[]): {
  tier: (typeof PRIORITY_TIER_CONFIG)[number];
  findings: (Finding & { dimensionId: string; dimensionName: string })[];
}[] {
  const all: (Finding & { dimensionId: string; dimensionName: string })[] = [];
  for (const dim of dims) {
    for (const f of dim.findings) {
      if (f.status === "critical" || f.status === "warning") {
        all.push({ ...f, dimensionId: dim.dimensionId, dimensionName: dim.dimensionName });
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

  return PRIORITY_TIER_CONFIG.map((tier) => ({
    tier,
    findings: all.filter((f) => tier.priorities.includes(f.priority)),
  })).filter((group) => group.findings.length > 0);
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

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="inline-block ml-1 -mt-0.5">
      <path d="M6 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1v-3M9 2h5v5M15 1L7.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonLoader() {
  return (
    <div className="px-6 py-12">
      <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
        <div className="h-10 bg-dark/10 rounded w-full" />
        <div className="space-y-3">
          <div className="h-6 bg-dark/10 rounded w-64" />
          <div className="h-4 bg-dark/10 rounded w-40" />
        </div>
        <div className="h-64 bg-dark/10 rounded-xl" />
        <div className="space-y-3">
          <div className="h-4 bg-dark/10 rounded w-full" />
          <div className="h-4 bg-dark/10 rounded w-5/6" />
          <div className="h-4 bg-dark/10 rounded w-4/6" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-40 bg-dark/10 rounded-xl" />
          <div className="h-40 bg-dark/10 rounded-xl" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-dark/10 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function StickyNav({
  reportId,
  activeSection,
  onNavClick,
}: {
  reportId: string;
  activeSection: string;
  onNavClick: (id: string) => void;
}) {
  return (
    <nav className="sticky top-0 z-40 bg-surface border-b border-dark/10">
      <div className="max-w-4xl mx-auto px-6 h-12 flex items-center justify-between">
        <a
          href={`/dashboard/report/${reportId}`}
          className="flex items-center gap-1.5 text-sm text-secondary hover:text-dark transition-colors flex-shrink-0"
        >
          <ArrowLeftIcon /> Back to Summary
        </a>
        <div className="flex items-center gap-1 overflow-x-auto ml-4">
          {NAV_SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => onNavClick(section.id)}
              className={`text-xs font-medium px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
                activeSection === section.id
                  ? "bg-brand/10 text-brand"
                  : "text-secondary hover:text-dark hover:bg-dark/5"
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

function OverviewSection({
  report,
  screenshotUrl,
}: {
  report: Report;
  screenshotUrl: string;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <section id="overview" className="scroll-mt-16 space-y-8">
      {/* Page header */}
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
        <p className="text-secondary text-sm">
          Analyzed{" "}
          {new Date(report.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
          {" · "}Score:{" "}
          <span className={`font-mono font-semibold ${getScoreColor(report.totalScore, report.maxTotalScore)}`}>
            {report.totalScore}/{report.maxTotalScore}
          </span>
        </p>
      </div>

      {/* Screenshot */}
      {!imgError && (
        <div className="rounded-xl overflow-hidden border border-dark/10">
          <img
            src={screenshotUrl}
            alt={`Screenshot of ${report.url}`}
            className="w-full h-auto"
            onError={() => setImgError(true)}
          />
        </div>
      )}

      {/* Narrative overview */}
      {report.synthesis.overview && (
        <div className="font-body text-base text-secondary leading-[1.7]">
          <p>{report.synthesis.overview}</p>
        </div>
      )}

      {/* What's Working / What Needs Attention cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {report.synthesis.strengths.length > 0 && (
          <FadeIn>
            <div className="bg-surface rounded-xl p-6 border-l-4 border-success h-full">
              <h3 className="font-heading italic text-xl text-dark mb-4">What&apos;s Working</h3>
              <div className="space-y-3">
                {report.synthesis.strengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircleIcon className="text-success flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-secondary leading-relaxed">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        )}

        {report.synthesis.criticalFixes.length > 0 && (
          <FadeIn>
            <div className="bg-surface rounded-xl p-6 border-l-4 border-critical h-full">
              <h3 className="font-heading italic text-xl text-dark mb-4">What Needs Attention</h3>
              <div className="space-y-3">
                {report.synthesis.criticalFixes.map((fix, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-[18px] h-[18px] rounded-full bg-critical/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="block w-2 h-2 rounded-full bg-critical" />
                    </span>
                    <p className="text-sm text-secondary leading-relaxed">{fix}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        )}
      </div>
    </section>
  );
}

function DimensionSection({
  id,
  title,
  dimensions,
  categoryScore,
}: {
  id: string;
  title: string;
  dimensions: DimensionResult[];
  categoryScore: { score: number; max: number };
}) {
  return (
    <section id={id} className="scroll-mt-16 space-y-8">
      <div>
        <h2 className="font-heading italic text-2xl text-dark">
          {title} —{" "}
          <span className={`font-mono ${getScoreColor(categoryScore.score, categoryScore.max)}`}>
            {categoryScore.score}/{categoryScore.max}
          </span>
        </h2>
        <hr className="mt-3 border-dark/10" />
      </div>

      {dimensions.map((dim, dimIdx) => (
        <div key={dim.dimensionId} className="space-y-5">
          <FadeIn>
            <h3 className="font-heading italic text-xl text-dark">
              {dim.dimensionId}: {dim.dimensionName} —{" "}
              <span className={`font-mono text-lg ${getScoreColor(dim.score, dim.maxScore)}`}>
                {dim.score}/{dim.maxScore}
              </span>
            </h3>
            {DIMENSION_DESCRIPTIONS[dim.dimensionId] && (
              <p className="text-sm text-secondary italic leading-relaxed mt-2">
                {DIMENSION_DESCRIPTIONS[dim.dimensionId]}
              </p>
            )}
          </FadeIn>

          <div className="space-y-4">
            {dim.findings.map((finding) => (
              <FindingFullCard key={finding.id} finding={finding} />
            ))}
          </div>

          {dimIdx < dimensions.length - 1 && (
            <hr className="border-dark/5" />
          )}
        </div>
      ))}
    </section>
  );
}

function FindingFullCard({ finding }: { finding: Finding }) {
  const isSuccess = finding.status === "success";
  const sColor = STATUS_COLORS[finding.status] || STATUS_COLORS.warning;
  const pStyle = PRIORITY_STYLES[finding.priority] || PRIORITY_STYLES.P2;

  return (
    <FadeIn>
      <div className={`bg-surface rounded-xl p-6 border-l-4 ${sColor.border}`}>
        {/* Top row */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${sColor.bg} ${sColor.text}`}>
            {isSuccess ? "Working Well" : pStyle.label}
          </span>
          {!isSuccess && (
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${pStyle.bg} ${pStyle.text}`}>
              {pStyle.tierLabel}
            </span>
          )}
          <span className={`font-mono text-xs font-semibold ml-auto ${getScoreColor(finding.score, finding.maxScore)}`}>
            {finding.score}/{finding.maxScore}
          </span>
        </div>

        {/* Title */}
        <h4 className="font-semibold text-dark text-base mb-4">{finding.name}</h4>

        {/* Labeled sections */}
        <div className="space-y-3">
          <LabeledSection label="What we found" text={finding.whatWeFound} />
          <LabeledSection
            label={isSuccess ? "Why this works" : "Why this matters"}
            text={finding.whyItMatters}
          />
          {finding.whatGoodLooksLike && (
            <LabeledSection label="What good looks like" text={finding.whatGoodLooksLike} />
          )}
          {isSuccess ? (
            <div className="bg-successBg border border-success/15 rounded-lg p-3">
              <p className="text-xs font-medium text-success mb-1">Recommendation</p>
              <p className="text-sm text-dark leading-relaxed">Preserve this in any redesign.</p>
            </div>
          ) : (
            finding.suggestedFix && (
              <div className="bg-brand/5 border border-brand/15 rounded-lg p-3">
                <p className="text-xs font-medium text-brand mb-1">Suggested fix</p>
                <p className="text-sm text-dark leading-relaxed">{finding.suggestedFix}</p>
              </div>
            )
          )}
        </div>

        {/* Footer pills */}
        {!isSuccess && (
          <div className="flex gap-4 text-xs text-secondary mt-4 pt-3 border-t border-dark/5">
            <span>
              Effort: <span className="font-medium text-dark">{finding.effort}</span>
            </span>
            <span>
              Impact: <span className="font-medium text-dark">{finding.expectedImpact}</span>
            </span>
          </div>
        )}
      </div>
    </FadeIn>
  );
}

function LabeledSection({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-secondary leading-relaxed">{text}</p>
    </div>
  );
}

function ActionPlanSection({ dimensions }: { dimensions: DimensionResult[] }) {
  const grouped = groupFindingsByPriority(dimensions);
  let globalRank = 0;

  return (
    <section id="action-plan" className="scroll-mt-16 space-y-8">
      <div>
        <h2 className="font-heading italic text-2xl text-dark">Action Plan</h2>
        <p className="text-sm text-secondary mt-1">
          Prioritized changes ranked by conversion impact. Start at the top.
        </p>
        <hr className="mt-3 border-dark/10" />
      </div>

      {grouped.map((group) => (
        <div key={group.tier.key} className="space-y-4">
          <h3 className="font-heading italic text-lg text-dark">{group.tier.label}</h3>
          {group.findings.map((finding) => {
            globalRank++;
            const pStyle = PRIORITY_STYLES[finding.priority] || PRIORITY_STYLES.P2;
            return (
              <FadeIn key={finding.id}>
                <div className={`bg-surface rounded-xl p-5 border-l-4 ${group.tier.borderColor}`}>
                  <div className="flex items-start gap-4">
                    <span className="font-mono text-lg font-bold text-dark/30 flex-shrink-0 w-8 text-right">
                      {globalRank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h4 className="font-semibold text-dark text-sm">{finding.name}</h4>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${pStyle.bg} ${pStyle.text}`}>
                          {finding.priority}
                        </span>
                      </div>
                      <p className="text-[11px] text-secondary mb-2">
                        {finding.dimensionId}: {finding.dimensionName}
                      </p>
                      <p className="text-sm text-secondary leading-relaxed mb-2">
                        {finding.whatWeFound}
                      </p>
                      {finding.suggestedFix && (
                        <div className="bg-brand/5 border border-brand/15 rounded-lg p-3 mb-3">
                          <p className="text-xs font-medium text-brand mb-1">Suggested fix</p>
                          <p className="text-sm text-dark leading-relaxed">{finding.suggestedFix}</p>
                        </div>
                      )}
                      <div className="flex gap-4 text-xs text-secondary">
                        <span>
                          Effort: <span className="font-medium text-dark">{finding.effort}</span>
                        </span>
                        <span>
                          Impact: <span className="font-medium text-dark">{finding.expectedImpact}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>
      ))}

      {grouped.length === 0 && (
        <div className="bg-surface rounded-xl p-8 text-center">
          <p className="text-secondary text-sm">No action items — everything looks great!</p>
        </div>
      )}
    </section>
  );
}

function ReportFooter({ reportId }: { reportId: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-3 pt-4 border-t border-dark/10">
      <button
        onClick={() => router.push(`/dashboard/report/${reportId}`)}
        className="bg-brand text-white font-semibold py-2.5 px-5 rounded-lg text-sm transition-colors hover:bg-brand/90"
      >
        Back to Summary
      </button>
      <button className="border border-dark/15 text-dark font-semibold py-2.5 px-5 rounded-lg text-sm transition-colors hover:bg-dark/5">
        Download Summary PDF
      </button>
      <button className="border border-dark/15 text-dark font-semibold py-2.5 px-5 rounded-lg text-sm transition-colors hover:bg-dark/5">
        Download Full Report PDF
      </button>
    </div>
  );
}

// ─── Custom Hook: useInView ──────────────────────────────────────────────────

function useInView(): { ref: React.RefCallback<HTMLElement>; inView: boolean } {
  const [inView, setInView] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback((node: HTMLElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (!node) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observerRef.current?.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observerRef.current.observe(node);
  }, []);

  return { ref, inView };
}

function FadeIn({ children }: { children: React.ReactNode }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 500ms ease-out, transform 500ms ease-out",
      }}
    >
      {children}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

type PageState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "loaded"; report: Report };

export default function DetailedReportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [state, setState] = useState<PageState>({ kind: "loading" });
  const [activeSection, setActiveSection] = useState("overview");

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
        setState({ kind: "loaded", report: data as Report });
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

  // IntersectionObserver for active section tracking
  useEffect(() => {
    if (state.kind !== "loaded") return;

    const sectionIds = NAV_SECTIONS.map((s) => s.id);
    const elements = sectionIds
      .map((sId) => document.getElementById(sId))
      .filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      {
        threshold: 0.1,
        rootMargin: "-80px 0px -60% 0px",
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [state.kind]);

  const handleNavClick = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
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

  // Loaded
  const report = state.report;
  const { design, conversion } = groupDimensions(report.dimensions);
  const designScore = getCategoryScore(design);
  const conversionScore = getCategoryScore(conversion);
  const screenshotUrl = `/api/screenshots/${id}`;

  return (
    <>
      <StickyNav reportId={id} activeSection={activeSection} onNavClick={handleNavClick} />

      <div className="px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-16">
          <OverviewSection report={report} screenshotUrl={screenshotUrl} />

          {design.length > 0 && (
            <DimensionSection
              id="design"
              title="Design Analysis"
              dimensions={design}
              categoryScore={designScore}
            />
          )}

          {conversion.length > 0 && (
            <DimensionSection
              id="conversion"
              title="Conversion Analysis"
              dimensions={conversion}
              categoryScore={conversionScore}
            />
          )}

          <ActionPlanSection dimensions={report.dimensions} />

          <ReportFooter reportId={id} />
        </div>
      </div>
    </>
  );
}
