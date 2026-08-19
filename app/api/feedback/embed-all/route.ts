import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateAndSaveEmbedding } from "@/lib/embeddings";

export async function POST() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const unembedded = await db.feedback.findMany({
    where: { workspaceId: user.workspaceId, embedding: null },
    select: { id: true, content: true },
  });

  let succeeded = 0;
  let failed = 0;

  for (const item of unembedded) {
    const ok = await generateAndSaveEmbedding(item.id, item.content);
    if (ok) succeeded++;
    else failed++;
  }

  return NextResponse.json({ total: unembedded.length, succeeded, failed });
}