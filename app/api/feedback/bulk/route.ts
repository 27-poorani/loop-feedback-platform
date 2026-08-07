import { NextResponse } from "next/server";
import Papa from "papaparse";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

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

  let successCount = 0;
  let failCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];

    if (!row.content || !row.channel) {
      failCount++;
      errors.push(`Row ${i + 2}: missing content or channel`);
      continue;
    }

    try {
      await db.feedback.create({
        data: {
          content: row.content,
          channel: row.channel,
          customerLabel: row.customer_label || null,
          workspaceId: user.workspaceId,
          status: "NEW",
        },
      });
      successCount++;
    } catch {
      failCount++;
      errors.push(`Row ${i + 2}: failed to save`);
    }
  }

  return NextResponse.json({
    imported: successCount,
    failed: failCount,
    errors: errors.slice(0, 10), // cap so response doesn't explode on huge files
  });
}