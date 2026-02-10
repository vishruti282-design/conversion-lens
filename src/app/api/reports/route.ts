import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { ReportMetadata } from "@/lib/types";

const REPORTS_DIR = path.join(process.cwd(), "data", "reports");

export async function GET() {
  try {
    let files: string[];
    try {
      files = await fs.readdir(REPORTS_DIR);
    } catch {
      // Directory doesn't exist yet — no reports
      return NextResponse.json([]);
    }

    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    const reports: ReportMetadata[] = await Promise.all(
      jsonFiles.map(async (file) => {
        const content = await fs.readFile(
          path.join(REPORTS_DIR, file),
          "utf-8"
        );
        const data = JSON.parse(content);

        // Handle both single reports and comparison reports
        if (data.reportA) {
          // ComparisonReport
          return {
            id: data.id,
            url: data.reportA.url,
            comparisonUrl: data.reportB.url,
            totalScore: data.reportA.totalScore + data.reportB.totalScore,
            maxTotalScore:
              data.reportA.maxTotalScore + data.reportB.maxTotalScore,
            createdAt: data.createdAt,
          };
        }

        // Single Report
        return {
          id: data.id,
          url: data.url,
          comparisonUrl: data.comparisonUrl,
          totalScore: data.totalScore,
          maxTotalScore: data.maxTotalScore,
          createdAt: data.createdAt,
        };
      })
    );

    // Sort newest first
    reports.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Error listing reports:", error);
    return NextResponse.json(
      { error: "Failed to list reports." },
      { status: 500 }
    );
  }
}
