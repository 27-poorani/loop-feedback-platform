import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(now.getDate() - 14);

  const themes = await db.theme.findMany({
    where: { workspaceId: user.workspaceId },
    include: {
      feedback: {
        include: {
          feedback: { select: { createdAt: true, sentiment: true } },
        },
      },
    },
  });

  const trends = themes.map((theme) => {
    const items = theme.feedback.map((f) => f.feedback);
    const dates = items.map((i) => i.createdAt);

    const currentItems = items.filter((i) => i.createdAt >= sevenDaysAgo);
    const previousItems = items.filter(
      (i) => i.createdAt >= fourteenDaysAgo && i.createdAt < sevenDaysAgo
    );

    const currentPeriod = currentItems.length;
    const previousPeriod = previousItems.length;

    let changePercent: number | null = null;
    const isNewActivity = previousPeriod === 0 && currentPeriod > 0;
    if (previousPeriod > 0) {
      changePercent = Math.round(
        ((currentPeriod - previousPeriod) / previousPeriod) * 100
      );
    }

    // Sentiment breakdown for THIS period's items in this theme
    const negativeCount = currentItems.filter(
      (i) => i.sentiment === "NEGATIVE"
    ).length;
    const positiveCount = currentItems.filter(
      (i) => i.sentiment === "POSITIVE"
    ).length;
    const classifiedCount = currentItems.filter((i) => i.sentiment).length;

    let dominantSentiment: "NEGATIVE" | "POSITIVE" | "MIXED" | "NEUTRAL" | null =
      null;
    if (classifiedCount > 0) {
      const negRatio = negativeCount / classifiedCount;
      const posRatio = positiveCount / classifiedCount;
      if (negRatio >= 0.6) dominantSentiment = "NEGATIVE";
      else if (posRatio >= 0.6) dominantSentiment = "POSITIVE";
      else if (negRatio > 0.3 && posRatio > 0.3) dominantSentiment = "MIXED";
      else dominantSentiment = "NEUTRAL";
    }

    const isSpiking =
      (changePercent !== null && changePercent >= 30) || isNewActivity;

    const byDay: Record<string, number> = {};
    dates.forEach((d) => {
      if (d >= fourteenDaysAgo) {
        const day = d.toISOString().split("T")[0];
        byDay[day] = (byDay[day] || 0) + 1;
      }
    });
    const series = Object.entries(byDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      id: theme.id,
      name: theme.name,
      total: dates.length,
      currentPeriod,
      previousPeriod,
      changePercent,
      isNewActivity,
      isSpiking,
      dominantSentiment,
      series,
    };
  });

  trends.sort((a, b) => {
    if (a.isSpiking !== b.isSpiking) return a.isSpiking ? -1 : 1;
    return b.total - a.total;
  });

  return NextResponse.json({ trends });
}