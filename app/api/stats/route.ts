import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const workspaceId = user.workspaceId;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [total, newThisWeek, negativeCount, allFeedback] = await Promise.all([
    db.feedback.count({ where: { workspaceId } }),
    db.feedback.count({
      where: { workspaceId, createdAt: { gte: oneWeekAgo } },
    }),
    db.feedback.count({
      where: { workspaceId, sentiment: "NEGATIVE" },
    }),
    db.feedback.findMany({
      where: { workspaceId, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, channel: true, sentiment: true },
    }),
  ]);

  // Volume over time — group by day
  const volumeByDay: Record<string, number> = {};
  allFeedback.forEach((f) => {
    const day = f.createdAt.toISOString().split("T")[0];
    volumeByDay[day] = (volumeByDay[day] || 0) + 1;
  });
  const volumeData = Object.entries(volumeByDay)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Channel breakdown (stand-in for "top themes" until AI classification exists)
  const channelCounts: Record<string, number> = {};
  allFeedback.forEach((f) => {
    channelCounts[f.channel] = (channelCounts[f.channel] || 0) + 1;
  });
  const channelData = Object.entries(channelCounts).map(([channel, count]) => ({
    channel,
    count,
  }));

  // Sentiment breakdown — will be mostly "unclassified" until Week 3 AI is built
  const sentimentCounts: Record<string, number> = {
    POSITIVE: 0,
    NEUTRAL: 0,
    NEGATIVE: 0,
    Unclassified: 0,
  };
  allFeedback.forEach((f) => {
    if (f.sentiment) {
      sentimentCounts[f.sentiment] += 1;
    } else {
      sentimentCounts.Unclassified += 1;
    }
  });
  const sentimentData = Object.entries(sentimentCounts)
    .filter(([, count]) => count > 0)
    .map(([name, value]) => ({ name, value }));

  const percentNegative = total > 0 ? Math.round((negativeCount / total) * 100) : 0;

  return NextResponse.json({
    total,
    newThisWeek,
    percentNegative,
    volumeData,
    channelData,
    sentimentData,
  });
}