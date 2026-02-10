"use client";

import { useState } from "react";

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

function isValidUrl(value: string) {
  return /^https?:\/\/.+/.test(value);
}

export default function DashboardPage() {
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [compareUrl, setCompareUrl] = useState("");
  const [compareUrlError, setCompareUrlError] = useState("");
  const [trafficSource, setTrafficSource] = useState("");
  const [campaignGoal, setCampaignGoal] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [contextOpen, setContextOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  function validateAndSubmit() {
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

    setLoading(true);

    const formData = {
      url: url.trim(),
      ...(compareOpen && compareUrl.trim() && { compareUrl: compareUrl.trim() }),
      ...(contextOpen && {
        trafficSource: trafficSource || undefined,
        campaignGoal: campaignGoal || undefined,
        targetAudience: targetAudience.trim() || undefined,
      }),
    };

    console.log("Form submitted:", formData);
    alert(JSON.stringify(formData, null, 2));

    setLoading(false);
  }

  const hasCompareUrl = compareOpen && compareUrl.trim() && isValidUrl(compareUrl.trim());
  const buttonDisabled = !url.trim() || loading;

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
            <label htmlFor="url" className="flex items-center gap-1.5 text-sm font-medium text-dark">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-secondary">
                <path d="M6.5 11.5L3.75 14.25C3.06 14.94 1.94 14.94 1.25 14.25L1.75 13.75C1.06 13.06 1.06 11.94 1.75 11.25L4.5 8.5M9.5 4.5L12.25 1.75C12.94 1.06 14.06 1.06 14.75 1.75C15.44 2.44 15.44 3.56 14.75 4.25L12 7M5.5 10.5L10.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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
                <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {contextOpen && (
              <div className="px-4 pb-4 space-y-4 border-t border-dark/10 pt-4">
                <div className="space-y-1.5">
                  <label htmlFor="traffic" className="block text-sm font-medium text-dark">
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
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="goal" className="block text-sm font-medium text-dark">
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
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="audience" className="block text-sm font-medium text-dark">
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
                <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {compareOpen && (
              <div className="px-4 pb-4 border-t border-dark/10 pt-4">
                <div className="space-y-1.5">
                  <label htmlFor="compareUrl" className="block text-sm font-medium text-dark">
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
            onClick={validateAndSubmit}
            disabled={buttonDisabled}
            className="w-full bg-brand text-white font-semibold py-3 px-6 rounded-lg transition-colors hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Analyzing…
              </span>
            ) : hasCompareUrl ? (
              "Compare Pages"
            ) : (
              "Analyze Page"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
