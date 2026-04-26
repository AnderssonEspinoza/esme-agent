import { NextResponse } from "next/server";

import { buildDailySummaryText } from "@/lib/server/daily-summary";
import { isTelegramConfigured, sendTelegramMessage } from "@/lib/server/telegram";

export async function GET() {
  try {
    if (!isTelegramConfigured()) {
      return NextResponse.json({ error: "Telegram no configurado." }, { status: 400 });
    }

    const text = await buildDailySummaryText();
    await sendTelegramMessage(text);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
