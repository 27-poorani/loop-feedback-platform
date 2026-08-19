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

  const rangeMs = rangeEnd.getTime() - rangeStart.getTime();
  const prevEnd = new Date(rangeStart.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - rangeMs);

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const [
    total,
    newThisWeek,
    newPrevWeek,
    negativeCount,
    rangeFeedback,
    prevFeedback,
    recent,
  ] = await Promise.all([
    db.feedback.count({ where: { workspaceId } }),
    db.feedback.count({
      where: { workspaceId, createdAt: { gte: oneWeekAgo } },
    }),
    db.feedback.count({
      where: {
        workspaceId,
        createdAt: { gte: twoWeeksAgo, lt: oneWeekAgo },
      },
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
      select: {
        createdAt: true,
        channel: true,
        sentiment: true,
      },
    }),
    db.feedback.findMany({
      where: {
        workspaceId,
        createdAt: { gte: prevStart, lte: prevEnd },
      },
      select: { sentiment: true },
    }),
    db.feedback.findMany({
      where: { workspaceId, createdAt: { gte: rangeStart, lte: rangeEnd } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        content: true,
        channel: true,
        sentiment: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  const rangeTotal = rangeFeedback.length;
  const prevRangeTotal = prevFeedback.length;

  const volumeByDay: Record<string, number> = {};
  rangeFeedback.forEach((f) => {
    const day = f.createdAt.toISOString().split("T")[0];
    volumeByDay[day] = (volumeByDay[day] || 0) + 1;
  });
  const volumeData = Object.entries(volumeByDay)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const channelCounts: Record<string, number> = {};
  const channelSentiment: Record<
    string,
    { count: number; negative: number; positive: number }
  > = {};
  rangeFeedback.forEach((f) => {
    channelCounts[f.channel] = (channelCounts[f.channel] || 0) + 1;
    if (!channelSentiment[f.channel]) {
      channelSentiment[f.channel] = { count: 0, negative: 0, positive: 0 };
    }
    channelSentiment[f.channel].count += 1;
    if (f.sentiment === "NEGATIVE") channelSentiment[f.channel].negative += 1;
    if (f.sentiment === "POSITIVE") channelSentiment[f.channel].positive += 1;
  });
  const channelData = Object.entries(channelCounts)
    .map(([channel, count]) => ({ channel, count }))
    .sort((a, b) => b.count - a.count);

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

  const prevNegative = prevFeedback.filter((f) => f.sentiment === "NEGATIVE").length;
  const prevPercentNegative =
    prevRangeTotal > 0 ? Math.round((prevNegative / prevRangeTotal) * 100) : null;

  const weekOverWeek =
    newPrevWeek > 0
      ? Math.round(((newThisWeek - newPrevWeek) / newPrevWeek) * 100)
      : newThisWeek > 0
        ? 100
        : 0;

  const volumeChange =
    prevRangeTotal > 0
      ? Math.round(((rangeTotal - prevRangeTotal) / prevRangeTotal) * 100)
      : rangeTotal > 0
        ? 100
        : 0;

  const channelStats = Object.entries(channelSentiment).map(([channel, s]) => ({
    channel,
    count: s.count,
    negativePct: s.count > 0 ? Math.round((s.negative / s.count) * 100) : 0,
    positivePct: s.count > 0 ? Math.round((s.positive / s.count) * 100) : 0,
  }));

  const highestNegative = [...channelStats].sort(
    (a, b) => b.negativePct - a.negativePct
  )[0];
  const highestPositive = [...channelStats].sort(
    (a, b) => b.positivePct - a.positivePct
  )[0];

  return NextResponse.json({
    total,
    newThisWeek,
    weekOverWeek,
    percentNegative,
    prevPercentNegative,
    rangeTotal,
    prevRangeTotal,
    volumeChange,
    volumeData,
    channelData,
    sentimentData,
    highestNegative,
    highestPositive,
    recent,
  });
}
