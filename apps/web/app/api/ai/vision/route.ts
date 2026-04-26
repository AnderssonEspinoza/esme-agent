import { NextResponse } from "next/server";

import { analyzeScheduleImage, isGeminiConfigured } from "@/lib/server/gemini";

type GeminiRouteError = Error & {
  status?: number;
  retryAfterSeconds?: number | null;
};

export async function POST(request: Request) {
  try {
    if (!isGeminiConfigured()) {
      return NextResponse.json({ error: "Gemini no configurado." }, { status: 400 });
    }

    const body = (await request.json()) as {
      mimeType?: string;
      base64Data?: string;
    };

    if (!body.mimeType || !body.base64Data) {
      return NextResponse.json({ error: "Faltan mimeType o base64Data." }, { status: 400 });
    }

    const result = await analyzeScheduleImage({
      mimeType: body.mimeType,
      base64Data: body.base64Data,
    });

    return NextResponse.json(result);
  } catch (error) {
    const err = error as GeminiRouteError;
    if (err.status === 429) {
      return NextResponse.json(
        {
          error: "Gemini alcanzó su cuota gratuita.",
          details:
            err.retryAfterSeconds != null
              ? `Tu cuota gratuita está agotada por ahora. Vuelve a intentarlo en ${err.retryAfterSeconds} segundos o usa otra API key/proyecto.`
              : "Tu cuota gratuita está agotada por ahora. Vuelve a intentarlo más tarde o usa otra API key/proyecto.",
          retryAfterSeconds: err.retryAfterSeconds ?? null,
        },
        { status: 429 },
      );
    }

    return NextResponse.json(
      {
        error: "No se pudo procesar la imagen con Gemini.",
        details: String(err),
      },
      { status: 500 },
    );
  }
}
