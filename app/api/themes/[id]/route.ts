import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  // Confirm the theme belongs to the caller's workspace before showing anything
  const theme = await db.theme.findFirst({
    where: { id, workspaceId: user.workspaceId },
  });

  if (!theme) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const links = await db.feedbackTheme.findMany({
    where: { themeId: id },
    include: { feedback: true },
    orderBy: { feedback: { createdAt: "desc" } },
  });

  return NextResponse.json({
    theme,
    feedback: links.map((l) => l.feedback),
  });
}