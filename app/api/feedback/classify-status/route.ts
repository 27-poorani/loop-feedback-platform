import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [total, unclassified] = await Promise.all([
    db.feedback.count({ where: { workspaceId: user.workspaceId } }),
    db.feedback.count({
      where: { workspaceId: user.workspaceId, sentiment: null },
    }),
  ]);

  return NextResponse.json({
    total,
    unclassified,
    classified: total - unclassified,
  });
}