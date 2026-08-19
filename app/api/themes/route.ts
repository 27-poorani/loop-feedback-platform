import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const themes = await db.theme.findMany({
    where: { workspaceId: user.workspaceId },
    include: {
      _count: {
        select: { feedback: true },
      },
    },
    orderBy: {
      feedback: { _count: "desc" },
    },
  });

  return NextResponse.json({
    themes: themes.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      count: t._count.feedback,
    })),
  });
}