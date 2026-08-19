import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { classifyAndSave } from "@/lib/classify";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (user.role === "VIEWER") {
    return NextResponse.json(
      { error: "Viewers cannot trigger classification" },
      { status: 403 }
    );
  }

  const { id } = await params;

  const feedback = await db.feedback.findFirst({
    where: { id, workspaceId: user.workspaceId },
  });

  if (!feedback) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ok = await classifyAndSave(feedback.id, feedback.content, user.workspaceId);

  if (!ok) {
    return NextResponse.json(
      { error: "Classification failed, try again" },
      { status: 500 }
    );
  }

  const updated = await db.feedback.findUnique({ where: { id } });
  return NextResponse.json({ feedback: updated });
}