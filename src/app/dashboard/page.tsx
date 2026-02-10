"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const TRAFFIC_SOURCES = [
  "Paid Search",
  "Paid Social",
  "Organic",
  "Email",
  "Direct",
];

const CAMPAIGN_GOALS = [
  "Lead Generation",
  "Free Trial Signup",
  "Purchase",
  "Demo Request",
  "Newsletter",
];

const STEPS = [
  "Capturing page",
  "Analyzing visual design",
  "Evaluating content structure",
  "Scoring trust & persuasion",
  "Generating recommendations",
];

const STEP_DURATIONS = [4000, 4000, 3500, 3500, 5000];

function isValidUrl(value: string) {
  return /^https?:\/\/.+/.test(value);
}

type ViewState =
  | { kind: "form" }
  | { kind: "loading"; url: string }
  | { kind: "error"; message: string };

export default function DashboardPage() {
  const router = useRouter();

  // Form state
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [compareUrl, setCompareUrl] = useState("");
  const [compareUrlError, setCompareUrlError] = useState("");
  const [trafficSource, setTrafficSource] = useState("");
  const [campaignGoal, setCampaignGoal] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [contextOpen, setContextOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  // View state
  const [view, setView] = useState<ViewState>({ kind: "form" });
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [apiDone, setApiDone] = useState(false);

  const apiResultRef = useRef<{ id: string } | null>(null);
  const stepTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Step progression
  const advanceStep = useCallback(() => {
    setActiveStep((prev) => {
      const next = prev + 1;
      if (next < STEPS.length) {
        return next;
      }
      // Stay on last step if API hasn't responded yet
      return prev;
    });
  }, []);

  useEffect(() => {
    if (view.kind !== "loading") return;

    // Start step timer
    let elapsed = 0;
    let currentStep = 0;

    const tick = () => {
      elapsed += 100;

      const totalDuration = STEP_DURATIONS.reduce((a, b) => a + b, 0);
      setProgress(Math.min(elapsed / totalDuration, 0.92));

      // Check if we should advance to next step
      let stepCumulative = 0;
      for (let i = 0; i <= currentStep; i++) {
        stepCumulative += STEP_DURATIONS[i];
      }

      if (elapsed >= stepCumulative && currentStep < STEPS.length - 1) {
        currentStep++;
        setActiveStep(currentStep);
      }
    };

    const interval = setInterval(tick, 100);
    stepTimerRef.current = interval;

    return () => clearInterval(interval);
  }, [view.kind, advanceStep]);

  // When API completes, animate to 100% and redirect
  useEffect(() => {
    if (!apiDone || !apiResultRef.current) return;

    setActiveStep(STEPS.length - 1);

    // Quick fill to 100%
    let p = progress;
    const fill = setInterval(() => {
      p += 0.04;
      if (p >= 1) {
        p = 1;
        setProgress(1);
        clearInterval(fill);
        // Brief pause at 100% then redirect
        setTimeout(() => {
          router.push(`/dashboard/report/${apiResultRef.current!.id}`);
        }, 400);
      } else {
        setProgress(p);
      }
    }, 30);

    return () => clearInterval(fill);
  }, [apiDone]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit() {
    let hasError = false;

    if (!url.trim()) {
      setUrlError("Please enter a URL");
      hasError = true;
    } else if (!isValidUrl(url.trim())) {
      setUrlError("URL must start with http:// or https://");
      hasError = true;
    } else {
      setUrlError("");
    }

    if (compareOpen && compareUrl.trim() && !isValidUrl(compareUrl.trim())) {
      setCompareUrlError("URL must start with http:// or https://");
      hasError = true;
    } else {
      setCompareUrlError("");
    }

    if (hasError) return;

    // Switch to loading view
    setView({ kind: "loading", url: url.trim() });
    setActiveStep(0);
    setProgress(0);
    setApiDone(false);
    apiResultRef.current = null;

    // Build request body
    const body: Record<string, string | undefined> = {
      url: url.trim(),
    };
    if (compareOpen && compareUrl.trim()) {
      body.comparisonUrl = compareUrl.trim();
    }
    if (contextOpen) {
      body.trafficSource = trafficSource || undefined;
      body.campaignGoal = campaignGoal || undefined;
      body.targetAudience = targetAudience.trim() || undefined;
    }

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Analysis failed (${res.status})`);
      }

      const report = await res.json();
      apiResultRef.current = report;

      // Clear step timer
      if (stepTimerRef.current) {
        clearInterval(stepTimerRef.current);
      }

      // Mark all steps complete
      setActiveStep(STEPS.length);
      setApiDone(true);
    } catch (err) {
      if (stepTimerRef.current) {
        clearInterval(stepTimerRef.current);
      }
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setView({ kind: "error", message });
    }
  }

  function handleTryAgain() {
    setView({ kind: "form" });
    setActiveStep(0);
    setProgress(0);
    setApiDone(false);
  }

  const hasCompareUrl =
    compareOpen && compareUrl.trim() && isValidUrl(compareUrl.trim());
  const buttonDisabled = !url.trim() || view.kind === "loading";

  // --- Loading View ---
  if (view.kind === "loading") {
    return (
      <div className="px-6 py-16">
        <div className="max-w-[520px] mx-auto">
          <div className="bg-surface rounded-xl p-8 space-y-8">
            <div className="text-center space-y-2">
              <h2 className="font-heading italic text-3xl text-dark">
                Analyzing {view.url}
              </h2>
              <p className="text-secondary text-sm">
                This usually takes 30-60 seconds
              </p>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-dark/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>

            {/* Steps checklist */}
            <div className="space-y-3">
              {STEPS.map((step, i) => {
                const isComplete = i < activeStep;
                const isActive = i === activeStep;
                const isPending = i > activeStep;

                return (
                  <div
                    key={step}
                    className={`flex items-center gap-3 transition-opacity duration-500 ${
                      isPending ? "opacity-40" : "opacity-100"
                    }`}
                  >
                    {/* Status icon */}
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                      {isComplete ? (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          fill="none"
                          className="text-success"
                        >
                          <circle cx="9" cy="9" r="9" fill="currentColor" />
                          <path
                            d="M5.5 9L8 11.5L12.5 6.5"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : isActive ? (
                        <div className="w-3.5 h-3.5 rounded-full bg-brand animate-pulse-dot" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-dark/20" />
                      )}
                    </div>

                    {/* Step label */}
                    <span
                      className={`text-sm transition-colors duration-300 ${
                        isComplete
                          ? "text-success font-medium"
                          : isActive
                            ? "text-dark font-medium"
                            : "text-secondary"
                      }`}
                    >
                      {step}
                      {isActive && !apiDone && (
                        <span className="text-secondary font-normal">...</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Error View ---
  if (view.kind === "error") {
    return (
      <div className="px-6 py-16">
        <div className="max-w-[520px] mx-auto">
          <div className="bg-surface rounded-xl p-8 space-y-6 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-critical/10 flex items-center justify-center">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                className="text-critical"
              >
                <path
                  d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="font-heading italic text-2xl text-dark">
                Analysis failed
              </h2>
              <p className="text-secondary text-sm leading-relaxed">
                {view.message}
              </p>
            </div>
            <button
              onClick={handleTryAgain}
              className="w-full bg-brand text-white font-semibold py-3 px-6 rounded-lg transition-colors hover:bg-brand/90"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Form View ---
  return (
    <div className="px-6 py-12">
      <div className="max-w-[640px] mx-auto space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="font-heading italic text-4xl text-dark">
            Analyze your landing page
          </h1>
          <p className="font-body text-secondary">
            Get a design + conversion diagnosis in 30 seconds
          </p>
        </div>

        <div className="bg-surface rounded-xl p-6 space-y-5">
          {/* URL Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="url"
              className="flex items-center gap-1.5 text-sm font-medium text-dark"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                className="text-secondary"
              >
                <path
                  d="M6.5 11.5L3.75 14.25C3.06 14.94 1.94 14.94 1.25 14.25L1.75 13.75C1.06 13.06 1.06 11.94 1.75 11.25L4.5 8.5M9.5 4.5L12.25 1.75C12.94 1.06 14.06 1.06 14.75 1.75C15.44 2.44 15.44 3.56 14.75 4.25L12 7M5.5 10.5L10.5 5.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Landing page URL
            </label>
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (urlError) setUrlError("");
              }}
              placeholder="https://example.com"
              className={`w-full px-4 py-3 text-base rounded-lg border bg-white text-dark placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-colors ${
                urlError ? "border-critical" : "border-dark/15"
              }`}
            />
            {urlError && (
              <p className="text-critical text-xs">{urlError}</p>
            )}
          </div>

          {/* Campaign Context Expandable */}
          <div className="border border-dark/10 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setContextOpen(!contextOpen)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-secondary hover:text-dark transition-colors"
            >
              <span>Add campaign context (improves accuracy)</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className={`transition-transform ${contextOpen ? "rotate-180" : ""}`}
              >
                <path
                  d="M4 6L8 10L12 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {contextOpen && (
              <div className="px-4 pb-4 space-y-4 border-t border-dark/10 pt-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="traffic"
                    className="block text-sm font-medium text-dark"
                  >
                    Traffic Source
                  </label>
                  <select
                    id="traffic"
                    value={trafficSource}
                    onChange={(e) => setTrafficSource(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-dark/15 bg-white text-dark focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-colors"
                  >
                    <option value="">Select...</option>
                    {TRAFFIC_SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="goal"
                    className="block text-sm font-medium text-dark"
                  >
                    Campaign Goal
                  </label>
                  <select
                    id="goal"
                    value={campaignGoal}
                    onChange={(e) => setCampaignGoal(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-dark/15 bg-white text-dark focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-colors"
                  >
                    <option value="">Select...</option>
                    {CAMPAIGN_GOALS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="audience"
                    className="block text-sm font-medium text-dark"
                  >
                    Target Audience
                  </label>
                  <input
                    id="audience"
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g., B2B SaaS buyers, mid-market"
                    className="w-full px-3 py-2 rounded-lg border border-dark/15 bg-white text-dark placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-colors"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Compare Expandable */}
          <div className="border border-dark/10 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setCompareOpen(!compareOpen)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-secondary hover:text-dark transition-colors"
            >
              <span>Compare two pages?</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className={`transition-transform ${compareOpen ? "rotate-180" : ""}`}
              >
                <path
                  d="M4 6L8 10L12 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {compareOpen && (
              <div className="px-4 pb-4 border-t border-dark/10 pt-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="compareUrl"
                    className="block text-sm font-medium text-dark"
                  >
                    Second page URL
                  </label>
                  <input
                    id="compareUrl"
                    type="url"
                    value={compareUrl}
                    onChange={(e) => {
                      setCompareUrl(e.target.value);
                      if (compareUrlError) setCompareUrlError("");
                    }}
                    placeholder="https://competitor.com"
                    className={`w-full px-3 py-2 rounded-lg border bg-white text-dark placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-colors ${
                      compareUrlError ? "border-critical" : "border-dark/15"
                    }`}
                  />
                  {compareUrlError && (
                    <p className="text-critical text-xs">{compareUrlError}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={buttonDisabled}
            className="w-full bg-brand text-white font-semibold py-3 px-6 rounded-lg transition-colors hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {hasCompareUrl ? "Compare Pages" : "Analyze Page"}
          </button>
        </div>
      </div>
    </div>
  );
}
