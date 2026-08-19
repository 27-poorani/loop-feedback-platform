import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dateFromParam = searchParams.get("dateFrom");
  const dateToParam = searchParams.get("dateTo");

  const workspaceId = user.workspaceId;

  const rangeEnd = dateToParam
    ? new Date(dateToParam + "T23:59:59")
    : new Date();

  const rangeStart = dateFromParam
    ? new Date(dateFromParam)
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d;
      })();

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const [total, newThisWeek, negativeCount, rangeFeedback] =
    await Promise.all([
      db.feedback.count({ where: { workspaceId } }),
      db.feedback.count({
        where: { workspaceId, createdAt: { gte: oneWeekAgo } },
      }),
      db.feedback.count({
        where: {
          workspaceId,
          sentiment: "NEGATIVE",
          createdAt: { gte: rangeStart, lte: rangeEnd },
        },
      }),
      db.feedback.findMany({
        where: {
          workspaceId,
          createdAt: { gte: rangeStart, lte: rangeEnd },
        },
        select: { createdAt: true, channel: true, sentiment: true },
      }),
    ]);

  const rangeTotal = rangeFeedback.length;

  const volumeByDay: Record<string, number> = {};
  rangeFeedback.forEach((f) => {
    const day = f.createdAt.toISOString().split("T")[0];
    volumeByDay[day] = (volumeByDay[day] || 0) + 1;
  });
  const volumeData = Object.entries(volumeByDay)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const channelCounts: Record<string, number> = {};
  rangeFeedback.forEach((f) => {
    channelCounts[f.channel] = (channelCounts[f.channel] || 0) + 1;
  });
  const channelData = Object.entries(channelCounts).map(
    ([channel, count]) => ({ channel, count })
  );

  const sentimentCounts: Record<string, number> = {
    POSITIVE: 0,
    NEUTRAL: 0,
    NEGATIVE: 0,
    Unclassified: 0,
  };
  rangeFeedback.forEach((f) => {
    if (f.sentiment) {
      sentimentCounts[f.sentiment] += 1;
    } else {
      sentimentCounts.Unclassified += 1;
    }
  });
  const sentimentData = Object.entries(sentimentCounts)
    .filter(([, count]) => count > 0)
    .map(([name, value]) => ({ name, value }));

  const percentNegative =
    rangeTotal > 0 ? Math.round((negativeCount / rangeTotal) * 100) : 0;

  return NextResponse.json({
    total,
    newThisWeek,
    percentNegative,
    rangeTotal,
    volumeData,
    channelData,
    sentimentData,
  });
}