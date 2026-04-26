import { NextResponse } from "next/server";

import { buildAssistantReply } from "@/lib/server/assistant";
import { isTelegramConfigured, sendTelegramMessageToChat } from "@/lib/server/telegram";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: {
      id?: number;
    };
  };
};

export async function POST(request: Request) {
  try {
    if (!isTelegramConfigured()) {
      return NextResponse.json({ error: "Telegram no configurado." }, { status: 400 });
    }

    const update = (await request.json()) as TelegramUpdate;
    const text = update.message?.text;
    const chatId = update.message?.chat?.id;

    if (!text || !chatId) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const reply = await buildAssistantReply(text);
    await sendTelegramMessageToChat(chatId, reply.reply);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Telegram webhook listo.",
  });
}
