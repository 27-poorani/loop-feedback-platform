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
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const feedback = await db.feedback.findMany({
    where: { workspaceId: user.workspaceId },
    orderBy: { createdAt: "desc" },
    take: 50, // basic limit for now; real pagination comes later
  });

  return NextResponse.json({ feedback });
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