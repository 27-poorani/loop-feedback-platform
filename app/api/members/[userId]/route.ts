import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

const updateRoleSchema = z.object({
  role: z.enum(["ADMIN", "ANALYST", "VIEWER"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireRole(["ADMIN"]);

  if (!admin) {
    return NextResponse.json(
      { error: "Only admins can change roles" },
      { status: 403 }
    );
  }

  const { userId } = await params;
  const body = await req.json();
  const parsed = updateRoleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Make sure the target user is in the SAME workspace as the admin.
  // Without this check, an admin from Company A could edit Company B's users.
  const targetUser = await db.user.findFirst({
    where: { id: userId, workspaceId: admin.workspaceId },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: { role: parsed.data.role },
  });

  return NextResponse.json({
    message: "Role updated",
    user: { id: updated.id, role: updated.role },
  });
}