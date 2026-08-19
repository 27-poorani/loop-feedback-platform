import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function isoDay(d: Date) {
  return d.toISOString().split("T")[0];
}

export async function GET(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const requested = parseInt(searchParams.get("days") || "14", 10);
  const windowDays = [7, 14, 30].includes(requested) ? requested : 14;
  const half = Math.floor(windowDays / 2);

  const now = new Date();
  const periodEnd = startOfDay(now);
  const periodStart = addDays(periodEnd, -(windowDays - 1));
  const currentStart = new Date(now);
  currentStart.setDate(now.getDate() - half);
  const previousStart = new Date(now);
  previousStart.setDate(now.getDate() - windowDays);

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

    const currentItems = items.filter((i) => i.createdAt >= currentStart);
    const previousItems = items.filter(
      (i) => i.createdAt >= previousStart && i.createdAt < currentStart
    );

    const currentPeriod = currentItems.length;
    const previousPeriod = previousItems.length;

    let changePercent: number | null = null;
    const isNewActivity = previousPeriod === 0 && currentPeriod > 0;
    if (previousPeriod > 0) {
      changePercent = Math.round(
        ((currentPeriod - previousPeriod) / previousPeriod) * 100
      );
    } else if (currentPeriod > 0) {
      changePercent = 100;
    }

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
      if (d >= periodStart) {
        const day = isoDay(d);
        byDay[day] = (byDay[day] || 0) + 1;
      }
    });

    const series: { date: string; count: number }[] = [];
    for (let i = 0; i < windowDays; i++) {
      const day = isoDay(addDays(periodStart, i));
      series.push({ date: day, count: byDay[day] || 0 });
    }

    return {
      id: theme.id,
      name: theme.name,
      description: theme.description,
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

  return NextResponse.json({
    trends,
    windowDays,
    periodStart: isoDay(periodStart),
    periodEnd: isoDay(periodEnd),
  });
}
