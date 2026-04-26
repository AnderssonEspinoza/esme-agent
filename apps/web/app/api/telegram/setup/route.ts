import { NextResponse } from "next/server";

import { isTelegramConfigured, setTelegramWebhook } from "@/lib/server/telegram";
import { env } from "@/lib/server/env";

export async function POST() {
  try {
    if (!isTelegramConfigured() || !env.xioPublicBaseUrl) {
      return NextResponse.json(
        { error: "Faltan TELEGRAM_BOT_TOKEN o XIO_PUBLIC_BASE_URL." },
        { status: 400 },
      );
    }

    const result = await setTelegramWebhook();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
