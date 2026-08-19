import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const now = new Date();
  const thirtyAgo = new Date(now);
  thirtyAgo.setDate(now.getDate() - 30);
  const sixtyAgo = new Date(now);
  sixtyAgo.setDate(now.getDate() - 60);

  const themes = await db.theme.findMany({
    where: { workspaceId: user.workspaceId },
    include: {
      _count: {
        select: { feedback: true },
      },
      feedback: {
        include: {
          feedback: { select: { createdAt: true } },
        },
      },
    },
    orderBy: {
      feedback: { _count: "desc" },
    },
  });

  return NextResponse.json({
    themes: themes.map((t) => {
      const dates = t.feedback.map((link) => link.feedback.createdAt);
      const current = dates.filter((d) => d >= thirtyAgo).length;
      const previous = dates.filter((d) => d >= sixtyAgo && d < thirtyAgo).length;
      let changePercent: number | null = null;
      if (previous > 0) {
        changePercent = Math.round(((current - previous) / previous) * 100);
      } else if (current > 0) {
        changePercent = 100;
      }

      return {
        id: t.id,
        name: t.name,
        description: t.description,
        count: t._count.feedback,
        changePercent,
      };
    }),
  });
}