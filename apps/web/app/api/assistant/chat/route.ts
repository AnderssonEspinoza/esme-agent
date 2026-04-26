import { NextResponse } from "next/server";

import { buildAssistantReply } from "@/lib/server/assistant";

type AssistantRequest = {
  message?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AssistantRequest;
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ error: "Falta el mensaje." }, { status: 400 });
    }

    const result = await buildAssistantReply(message);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
