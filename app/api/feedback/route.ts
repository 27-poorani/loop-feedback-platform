import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const createFeedbackSchema = z.object({
  content: z.string().min(1, "Feedback content is required"),
  channel: z.string().min(1, "Channel is required"),
  customerLabel: z.string().optional(),
});

// GET /api/feedback — list feedback for the caller's workspace
export async function GET(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const search = searchParams.get("search") || "";
  const channel = searchParams.get("channel") || "";
  const status = searchParams.get("status") || "";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";
  const pageSize = 10;

  const where = {
    workspaceId: user.workspaceId,
    ...(search
      ? { content: { contains: search, mode: "insensitive" as const } }
      : {}),
    ...(channel ? { channel } : {}),
    ...(status ? { status: status as "NEW" | "REVIEWED" | "ACTIONED" } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
          },
        }
      : {}),
  };

  const [feedback, total] = await Promise.all([
    db.feedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.feedback.count({ where }),
  ]);

  return NextResponse.json({
    feedback,
    total,
    page,
    totalPages: Math.ceil(total / pageSize),
  });
}
// POST /api/feedback — create a new feedback item
export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Per the brief: Viewers are read-only, cannot ingest feedback.
  if (user.role === "VIEWER") {
    return NextResponse.json(
      { error: "Viewers cannot add feedback" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = createFeedbackSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const feedback = await db.feedback.create({
    data: {
      content: parsed.data.content,
      channel: parsed.data.channel,
      customerLabel: parsed.data.customerLabel,
      workspaceId: user.workspaceId,
      status: "NEW",
    },
  });

  return NextResponse.json({ feedback }, { status: 201 });
}