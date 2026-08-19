import { db } from "@/lib/db";

const GEMINI_EMBED_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent";

export async function getEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(
      `${GEMINI_EMBED_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text }] },
      }),
      }
    );

    if (!res.ok) {
      console.error("Embedding request failed:", await res.text());
      return null;
    }

    const data = await res.json();
    return data.embedding?.values ?? null;
  } catch (err) {
    console.error("Embedding error:", err);
    return null;
  }
}

export async function generateAndSaveEmbedding(
  feedbackId: string,
  content: string
) {
  const vector = await getEmbedding(content);
  if (!vector) return false;

  await db.embedding.upsert({
    where: { feedbackId },
    update: { vector },
    create: { feedbackId, vector },
  });

  return true;
}

// Measures how "close in meaning" two vectors are (1 = identical, 0 = unrelated)
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}