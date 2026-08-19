import { db } from "@/lib/db";
import { classifyFeedback } from "@/lib/ai";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function classifyAndSave(
  feedbackId: string,
  content: string,
  workspaceId: string,
  retries = 2
) {
  const existingThemes = await db.theme.findMany({
    where: { workspaceId },
  });

  let result = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    result = await classifyFeedback(
      content,
      existingThemes.map((t) => t.name)
    );
    if (result) break;
    await sleep(2500); // back off before retrying, respects Groq's rate limit
  }

  if (!result) return false;

  await db.feedback.update({
    where: { id: feedbackId },
    data: {
      sentiment: result.sentiment,
      sentimentScore: result.sentimentScore,
    },
  });

  for (const themeName of result.themes) {
    let theme = existingThemes.find(
      (t) => t.name.toLowerCase() === themeName.toLowerCase()
    );

    if (!theme) {
      theme = await db.theme.create({
        data: { name: themeName, workspaceId },
      });
      existingThemes.push(theme);
    }

    await db.feedbackTheme.upsert({
      where: {
        feedbackId_themeId: { feedbackId, themeId: theme.id },
      },
      update: {},
      create: { feedbackId, themeId: theme.id, confidence: 1.0 },
    });
  }

  return true;
}