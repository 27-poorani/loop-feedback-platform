import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateVoCReport } from "@/lib/report";

// GET — list past reports
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const reports = await db.report.findMany({
    where: { workspaceId: user.workspaceId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      periodStart: true,
      periodEnd: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ reports });
}

// POST — generate a new report
export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (user.role === "VIEWER") {
    return NextResponse.json(
      { error: "Viewers cannot generate reports" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const periodDays = body.periodDays === 30 ? 30 : 7;

  try {
    const report = await generateVoCReport(
      user.workspaceId,
      user.id,
      periodDays
    );
    return NextResponse.json({ report }, { status: 201 });
  } catch (err) {
    console.error("Report generation failed:", err);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}