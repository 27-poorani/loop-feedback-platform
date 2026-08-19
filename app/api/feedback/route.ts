import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { classifyAndSave } from "@/lib/classify";
import { generateAndSaveEmbedding } from "@/lib/embeddings";

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
  const sentiment = searchParams.get("sentiment") || "";
  const themeId = searchParams.get("themeId") || "";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";
  const sortDir = searchParams.get("sort") === "oldest" ? "asc" : "desc";
  const pageSize = 10;

  const where = {
    workspaceId: user.workspaceId,
    ...(search
      ? { content: { contains: search, mode: "insensitive" as const } }
      : {}),
    ...(channel ? { channel } : {}),
    ...(status ? { status: status as "NEW" | "REVIEWED" | "ACTIONED" } : {}),
    ...(sentiment
      ? { sentiment: sentiment as "POSITIVE" | "NEUTRAL" | "NEGATIVE" }
      : {}),
    ...(themeId ? { themes: { some: { themeId } } } : {}),
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
      orderBy: { createdAt: sortDir },
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

  // Create the feedback record FIRST — everything below depends on its id.
  const feedback = await db.feedback.create({
    data: {
      content: parsed.data.content,
      channel: parsed.data.channel,
      customerLabel: parsed.data.customerLabel,
      workspaceId: user.workspaceId,
      status: "NEW",
    },
  });

  // Classify and embed in the background — don't make the user wait,
  // and don't fail the whole request if either has an issue.
  classifyAndSave(feedback.id, feedback.content, user.workspaceId).catch(
    (err) => console.error("Background classification failed:", err)
  );

  generateAndSaveEmbedding(feedback.id, feedback.content).catch((err) =>
    console.error("Background embedding failed:", err)
  );

  return NextResponse.json({ feedback }, { status: 201 });
}