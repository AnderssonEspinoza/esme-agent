import { NextResponse } from "next/server";

import { isTelegramConfigured, sendTelegramMessage } from "@/lib/server/telegram";

export async function POST(request: Request) {
  try {
    if (!isTelegramConfigured()) {
      return NextResponse.json({ error: "Telegram no configurado." }, { status: 400 });
    }

    const body = (await request.json()) as { text?: string };

    if (!body.text) {
      return NextResponse.json({ error: "Falta text." }, { status: 400 });
    }

    const result = await sendTelegramMessage(body.text);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

