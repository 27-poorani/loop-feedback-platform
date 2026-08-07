import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { SIMULATED_CHANNELS } from "@/lib/sample-feedback";

export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (user.role === "VIEWER") {
    return NextResponse.json(
      { error: "Viewers cannot add feedback" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const channel = body.channel as keyof typeof SIMULATED_CHANNELS;

  const items = SIMULATED_CHANNELS[channel];

  if (!items) {
    return NextResponse.json({ error: "Unknown channel" }, { status: 400 });
  }

  const created = await db.feedback.createMany({
    data: items.map((item) => ({
      content: item.content,
      channel,
      customerLabel: item.customerLabel,
      workspaceId: user.workspaceId,
      status: "NEW" as const,
    })),
  });

  return NextResponse.json({ imported: created.count });
}