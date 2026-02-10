export interface CampaignContext {
  trafficSource?: string;
  campaignGoal?: string;
  targetAudience?: string;
}

export interface AnalyzeRequest {
  url: string;
  comparisonUrl?: string;
  trafficSource?: string;
  campaignGoal?: string;
  targetAudience?: string;
}

export interface PageCapture {
  screenshot: string; // base64
  html: string;
  textContent: string;
  url: string;
}

export interface SubScore {
  id: string;
  name: string;
  score: number;
  maxScore: number;
}

export interface Finding {
  id: string;
  name: string;
  status: "critical" | "warning" | "success";
  priority: "P0" | "P1" | "P2" | "P3";
  score: number;
  maxScore: number;
  whatWeFound: string;
  whyItMatters: string;
  whatGoodLooksLike: string;
  suggestedFix: string;
  effort: string;
  expectedImpact: string;
}

export interface DimensionResult {
  dimensionId: string;
  dimensionName: string;
  score: number;
  maxScore: number;
  subScores: SubScore[];
  findings: Finding[];
}

export interface Synthesis {
  overview: string;
  strengths: string[];
  criticalFixes: string[];
  actionPlan: string[];
}

export interface Report {
  id: string;
  url: string;
  comparisonUrl?: string;
  campaignContext: CampaignContext;
  dimensions: DimensionResult[];
  synthesis: Synthesis;
  totalScore: number;
  maxTotalScore: number;
  createdAt: string;
}

export interface ComparisonReport {
  id: string;
  reportA: Report;
  reportB: Report;
  comparison: Synthesis;
  createdAt: string;
}

export interface ReportMetadata {
  id: string;
  url: string;
  comparisonUrl?: string;
  totalScore: number;
  maxTotalScore: number;
  createdAt: string;
}
