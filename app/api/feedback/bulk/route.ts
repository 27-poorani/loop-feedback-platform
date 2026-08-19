import { NextResponse } from "next/server";
import { after } from "next/server";
import Papa from "papaparse";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { classifyAndSave } from "@/lib/classify";
import { generateAndSaveEmbedding } from "@/lib/embeddings";

type CsvRow = {
  content?: string;
  channel?: string;
  customer_label?: string;
};

export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (user.role === "VIEWER") {
    return NextResponse.json(
      { error: "Viewers cannot upload feedback" },
      { status: 403 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const text = await file.text();
  const parsed = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const validRows = parsed.data.filter((row) => row.content && row.channel);
  const invalidCount = parsed.data.length - validRows.length;
  const workspaceId = user.workspaceId;

  // Insert rows now — this part is fast (just database writes),
  // so the user sees a real "Imported X items" result immediately.
  const created = await db.feedback.createMany({
    data: validRows.map((row) => ({
      content: row.content!,
      channel: row.channel!,
      customerLabel: row.customer_label || null,
      workspaceId,
      status: "NEW" as const,
    })),
  });

  // Classification + embedding are the slow parts (AI calls) — push these
  // into the background so navigating away never interrupts them.
  after(async () => {
    const freshRows = await db.feedback.findMany({
      where: { workspaceId, sentiment: null },
      select: { id: true, content: true },
      orderBy: { createdAt: "desc" },
      take: created.count,
    });

    for (const item of freshRows) {
      await classifyAndSave(item.id, item.content, workspaceId).catch((err) =>
        console.error("Background classify failed:", err)
      );
      await new Promise((resolve) => setTimeout(resolve, 2200)); // ~27/min, under Groq's 30 limit
    }
  });

  return NextResponse.json({
    imported: created.count,
    failed: invalidCount,
    errors: [],
  });
}