import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const updateStatusSchema = z.object({
  status: z.enum(["NEW", "REVIEWED", "ACTIONED"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (user.role === "VIEWER") {
    return NextResponse.json(
      { error: "Viewers cannot change status" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateStatusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Confirm this feedback item actually belongs to the caller's workspace
  // before updating it — prevents cross-tenant edits even by guessing an ID.
  const existing = await db.feedback.findFirst({
    where: { id, workspaceId: user.workspaceId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.feedback.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({ feedback: updated });
}