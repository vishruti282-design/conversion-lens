import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const REPORTS_DIR = path.join(process.cwd(), "data", "reports");

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // Sanitize ID to prevent path traversal
  if (!/^[a-f0-9-]+$/.test(id)) {
    return NextResponse.json(
      { error: "Invalid report ID." },
      { status: 400 }
    );
  }

  try {
    const filePath = path.join(REPORTS_DIR, `${id}.json`);
    const content = await fs.readFile(filePath, "utf-8");
    return NextResponse.json(JSON.parse(content));
  } catch {
    return NextResponse.json(
      { error: "Report not found." },
      { status: 404 }
    );
  }
}
