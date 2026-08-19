import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST() {
  const admin = await requireRole(["ADMIN"]);

  if (!admin) {
    return NextResponse.json(
      { error: "Only admins can remove duplicates" },
      { status: 403 }
    );
  }

  const allFeedback = await db.feedback.findMany({
    where: { workspaceId: admin.workspaceId },
    orderBy: { createdAt: "asc" }, // oldest first, so we keep the original
    select: { id: true, content: true },
  });

  // Group by exact content match (trimmed, case-insensitive)
  const seen = new Map<string, string>(); // normalized content -> id to KEEP
  const idsToDelete: string[] = [];

  for (const item of allFeedback) {
    const key = item.content.trim().toLowerCase();
    if (seen.has(key)) {
      idsToDelete.push(item.id); // duplicate — mark for deletion
    } else {
      seen.set(key, item.id); // first time seeing this content — keep it
    }
  }

  if (idsToDelete.length > 0) {
    await db.feedbackTheme.deleteMany({
      where: { feedbackId: { in: idsToDelete } },
    });
    await db.embedding.deleteMany({
      where: { feedbackId: { in: idsToDelete } },
    });
    await db.feedback.deleteMany({
      where: { id: { in: idsToDelete } },
    });
  }

  return NextResponse.json({
    removed: idsToDelete.length,
    remaining: allFeedback.length - idsToDelete.length,
  });
}