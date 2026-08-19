import { NextResponse } from "next/server";
import { after } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { classifyAndSave } from "@/lib/classify";

export async function POST() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (user.role === "VIEWER") {
    return NextResponse.json(
      { error: "Viewers cannot trigger classification" },
      { status: 403 }
    );
  }

  const unclassified = await db.feedback.findMany({
    where: { workspaceId: user.workspaceId, sentiment: null },
    select: { id: true, content: true },
  });

  const total = unclassified.length;
  const workspaceId = user.workspaceId;

  // Runs AFTER this response is sent — keeps going even if the user
  // navigates away, since it's no longer tied to their connection.
  after(async () => {
   for (const item of unclassified) {
      await classifyAndSave(item.id, item.content, workspaceId).catch((err) =>
        console.error("Background classify failed:", err)
      );
      await new Promise((resolve) => setTimeout(resolve, 2200)); // ~27/min, under Groq's 30 limit
    }
  });

  return NextResponse.json({ started: true, total });
}