import { db } from "@/lib/db";
import { getEmbedding, cosineSimilarity } from "@/lib/embeddings";

export async function retrieveRelevantFeedback(
  question: string,
  workspaceId: string,
  limit = 8
) {
  const questionVector = await getEmbedding(question);

  const candidates = await db.feedback.findMany({
    where: { workspaceId, embedding: { isNot: null } },
    select: { id: true, embedding: { select: { vector: true } } },
    take: 300,
  });

  if (!questionVector || candidates.length === 0) {
    // Fallback if embeddings aren't ready yet — recent items instead of nothing
    return db.feedback.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  const ranked = candidates
    .filter((c) => c.embedding)
    .map((c) => ({
      id: c.id,
      score: cosineSimilarity(questionVector, c.embedding!.vector),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const topIds = ranked.map((r) => r.id);
  const feedbackItems = await db.feedback.findMany({
    where: { id: { in: topIds } },
  });

  // Preserve the relevance ranking order (findMany doesn't guarantee it)
  return topIds
    .map((id) => feedbackItems.find((f) => f.id === id))
    .filter((f): f is NonNullable<typeof f> => Boolean(f));
}