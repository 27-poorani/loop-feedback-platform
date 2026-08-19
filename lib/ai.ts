import OpenAI from "openai";
import { z } from "zod";

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// llama-3.3-70b-versatile was shut down on Groq (free/developer) on 2026-08-16.
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const classificationSchema = z.object({
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]),
  sentimentScore: z.number().min(-1).max(1),
  themes: z.array(z.string()).min(1).max(3),
  featureArea: z.string(),
});

export type ClassificationResult = z.infer<typeof classificationSchema>;

export async function classifyFeedback(
  content: string,
  existingThemeNames: string[] = []
): Promise<ClassificationResult | null> {
  const themeHint =
    existingThemeNames.length > 0
      ? `Existing themes you should reuse if they fit: ${existingThemeNames.join(", ")}.`
      : "";

  const prompt = `You are analyzing a piece of customer feedback for a product team.

Feedback: "${content}"

${themeHint}

Return ONLY valid JSON (no markdown, no explanation) matching this exact shape:
{
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  "sentimentScore": <number between -1 and 1>,
  "themes": [<1-3 short theme names, e.g. "Onboarding", "Billing", "Performance">],
  "featureArea": "<one short label for what part of the product this is about>"
}`;



  try {
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const validated = classificationSchema.safeParse(parsed);

    if (!validated.success) {
      console.error("Classification validation failed:", validated.error);
      return null;
    }

    return validated.data;
  } catch (error) {
    console.error("Classification error:", error);
    return null;
  }
}

export async function answerQuestion(
  question: string,
  feedbackItems: { id: string; content: string }[]
): Promise<string> {
  if (feedbackItems.length === 0) {
    return "I couldn't find any feedback related to that question.";
  }

  const context = feedbackItems
    .map((f, i) => `[${i + 1}] ${f.content}`)
    .join("\n");

  const prompt = `You are answering a question about customer feedback for a product team.

Only use the feedback provided below. Do not invent or assume anything not stated in it. If the feedback doesn't contain enough information to answer, say so honestly.

Feedback:
${context}

Question: ${question}

Write the answer in this format:

Start with one sentence: "Based on ${feedbackItems.length} pieces of feedback, ..." then a short overview.

If the feedback includes positives, add this section exactly:
**What users like**
- bullet points (only facts from the feedback)

If the feedback includes negatives or complaints, add this section exactly:
**What users dislike**
- bullet points (only facts from the feedback)

If likes/dislikes don't fit the question, use short **Section titles** and bullets instead. Keep it concise. Never invent feedback.`;

  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  return (
    response.choices[0]?.message?.content?.trim() ?? "No answer generated."
  );
}

export async function generateNarrative(prompt: string): Promise<string | null> {
  try {
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    });
    return response.choices[0]?.message?.content?.trim() ?? null;
  } catch (error) {
    console.error("Narrative generation error:", error);
    return null;
  }
}