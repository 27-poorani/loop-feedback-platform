import { db } from "@/lib/db";
import { generateNarrative } from "@/lib/ai";

export async function generateVoCReport(
  workspaceId: string,
  userId: string,
  periodDays = 7
) {
  const periodEnd = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - periodDays);

  const prevPeriodEnd = new Date(periodStart);
  const prevPeriodStart = new Date(periodStart);
  prevPeriodStart.setDate(prevPeriodStart.getDate() - periodDays);

  const [currentFeedback, prevFeedback] = await Promise.all([
    db.feedback.findMany({
      where: {
        workspaceId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      include: { themes: { include: { theme: true } } },
    }),
    db.feedback.findMany({
      where: {
        workspaceId,
        createdAt: { gte: prevPeriodStart, lt: prevPeriodEnd },
      },
      select: { sentiment: true },
    }),
  ]);

  const total = currentFeedback.length;

  // Sentiment breakdown, this period vs previous period
  const countBySentiment = (items: { sentiment: string | null }[], s: string) =>
    items.filter((f) => f.sentiment === s).length;

  const negativeNow = countBySentiment(currentFeedback, "NEGATIVE");
  const negativePrev = countBySentiment(prevFeedback, "NEGATIVE");
  const pctNegativeNow = total > 0 ? Math.round((negativeNow / total) * 100) : 0;
  const pctNegativePrev =
    prevFeedback.length > 0
      ? Math.round((negativePrev / prevFeedback.length) * 100)
      : null;

  // Top themes this period, by count
  const themeCounts: Record<string, number> = {};
  currentFeedback.forEach((f) => {
    f.themes.forEach((ft) => {
      themeCounts[ft.theme.name] = (themeCounts[ft.theme.name] || 0) + 1;
    });
  });
  const topThemes = Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Representative quotes — most negative and most positive by score
  const sorted = [...currentFeedback].sort(
    (a, b) => (a.sentimentScore ?? 0) - (b.sentimentScore ?? 0)
  );
  const mostNegative = sorted.slice(0, 3).map((f) => f.content);
  const mostPositive = sorted
    .slice(-3)
    .reverse()
    .map((f) => f.content);

  const stats = {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    total,
    pctNegativeNow,
    pctNegativePrev,
    topThemes,
    mostNegative,
    mostPositive,
  };

  // Build the prompt from REAL computed numbers only — the AI writes
  // the narrative, it doesn't invent the figures.
  const prompt = `You are writing a Voice-of-Customer report for a product team, covering the last ${periodDays} days.

Real data for this period:
- Total feedback items: ${total}
- % negative sentiment: ${pctNegativeNow}%${
    pctNegativePrev !== null
      ? ` (was ${pctNegativePrev}% in the previous ${periodDays}-day period)`
      : " (no prior period data to compare)"
  }
- Top themes: ${
    topThemes.length > 0
      ? topThemes.map((t) => `${t.name} (${t.count})`).join(", ")
      : "none yet"
  }
- Sample negative feedback: ${
    mostNegative.length > 0 ? mostNegative.join(" | ") : "none"
  }
- Sample positive feedback: ${
    mostPositive.length > 0 ? mostPositive.join(" | ") : "none"
  }

Write a concise report with these sections, using ONLY the data above (do not invent numbers or themes not listed):
1. A one-paragraph executive summary
2. Top themes this period (brief bullet-style sentences)
3. Sentiment trend (mention the % change if previous-period data exists)
4. 2-3 recommended actions based on the above

Keep it professional and concise, like something you'd forward to a Head of Product.`;

  const narrative = await generateNarrative(prompt);

  const report = await db.report.create({
    data: {
      title: `Voice of Customer — Last ${periodDays} Days`,
      periodStart,
      periodEnd,
      contentJson: {
        stats,
        narrative: narrative ?? "Report narrative could not be generated.",
      },
      workspaceId,
      generatedById: userId,
    },
  });

  return report;
}