import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { retrieveRelevantFeedback } from "@/lib/retrieval";
import { answerQuestion } from "@/lib/ai";

export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const question = (body.question || "").trim();

  if (!question) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }

  try {
    const sources = await retrieveRelevantFeedback(question, user.workspaceId);
    const answer = await answerQuestion(question, sources);
    return NextResponse.json({ answer, sources });
  } catch (err) {
    console.error("Ask LOOP failed:", err);
    return NextResponse.json(
      {
        error:
          "The AI service is temporarily unavailable (rate limit reached). Please wait a minute and try again.",
      },
      { status: 503 }
    );
  }
}