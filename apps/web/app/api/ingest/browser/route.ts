import { NextResponse } from "next/server";

import { env } from "@/lib/server/env";
import { insertNote, insertTask, isSupabaseAdminConfigured } from "@/lib/server/supabase-admin";
import { insertNoteLocal, insertTaskLocal } from "@/lib/server/local-store";

type BrowserPayload = {
  source?: string;
  kind?: string;
  capturedAt?: string;
  data?: {
    title?: string;
    company?: string;
    url?: string;
  };
};

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: Request) {
  try {
    if (request.headers.get("x-xio-ingest-token") !== env.xioIngestToken) {
      return unauthorized();
    }

    const payload = (await request.json()) as BrowserPayload;
    const title = payload.data?.title ?? "Captura web";
    const company = payload.data?.company ? ` - ${payload.data.company}` : "";
    const url = payload.data?.url ?? "";

    const taskInput = {
      title: `${payload.source === "linkedin" ? "Vacante detectada" : "Captura detectada"}: ${title}${company}`,
      description: url ? `URL capturada: ${url}` : `Fuente: ${payload.source ?? "browser"}`,
      sourceType: "import" as const,
      priority:
        payload.source === "linkedin"
          ? ("medium" as const)
          : ("low" as const),
    };

    const noteInput = {
      title: `Ingesta ${payload.source ?? "browser"}`,
      content: JSON.stringify(payload),
    };

    if (isSupabaseAdminConfigured()) {
      try {
        await insertTask(taskInput);
        await insertNote(noteInput);
      } catch {
        await insertTaskLocal(taskInput);
        await insertNoteLocal(noteInput);
      }
    } else {
      await insertTaskLocal(taskInput);
      await insertNoteLocal(noteInput);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
