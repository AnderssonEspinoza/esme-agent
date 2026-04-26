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
    items?: Array<{
      title?: string;
      deadline?: string;
      course?: string;
      detail?: string;
    }>;
  };
};

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function parseDeadline(value?: string) {
  if (!value) return null;
  const text = value.trim().toLowerCase();

  const monthMap: Record<string, number> = {
    enero: 0,
    febrero: 1,
    marzo: 2,
    abril: 3,
    mayo: 4,
    junio: 5,
    julio: 6,
    agosto: 7,
    septiembre: 8,
    setiembre: 8,
    octubre: 9,
    noviembre: 10,
    diciembre: 11,
  };

  const longMatch = text.match(/(\d{1,2})\s+de\s+([a-záéíóú]+)(?:\s+de\s+(\d{4}))?/i);
  if (longMatch) {
    const day = Number.parseInt(longMatch[1] ?? "", 10);
    const monthLabel = (longMatch[2] ?? "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
    const month = monthMap[monthLabel];
    const year = Number.parseInt(longMatch[3] ?? `${new Date().getFullYear()}`, 10);
    if (month != null && Number.isInteger(day)) {
      const date = new Date(year, month, day, 23, 0, 0, 0);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }

  const shortMatch = text.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (shortMatch) {
    const day = Number.parseInt(shortMatch[1] ?? "", 10);
    const month = Number.parseInt(shortMatch[2] ?? "", 10) - 1;
    const y = shortMatch[3];
    const year = y
      ? y.length === 2
        ? 2000 + Number.parseInt(y, 10)
        : Number.parseInt(y, 10)
      : new Date().getFullYear();
    const date = new Date(year, month, day, 23, 0, 0, 0);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct.toISOString();
  }

  return null;
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

    const items = Array.isArray(payload.data?.items) ? payload.data.items : [];
    const normalizedItems = items
      .map((item) => {
        const itemTitle = item.title?.trim();
        if (!itemTitle) return null;
        return {
          title: itemTitle,
          description: [item.course, item.detail].filter(Boolean).join(" - ") || `Fuente: ${payload.source ?? "browser"}`,
          dueAt: parseDeadline(item.deadline),
        };
      })
      .filter((item): item is { title: string; description: string; dueAt: string | null } => Boolean(item))
      .slice(0, 20);

    if (isSupabaseAdminConfigured()) {
      try {
        await insertTask(taskInput);
        for (const item of normalizedItems) {
          await insertTask({
            title: `Entrega detectada: ${item.title}`,
            description: item.description,
            dueAt: item.dueAt,
            sourceType: "import",
            priority: item.dueAt ? "high" : "medium",
          });
        }
        await insertNote(noteInput);
      } catch {
        await insertTaskLocal(taskInput);
        for (const item of normalizedItems) {
          await insertTaskLocal({
            title: `Entrega detectada: ${item.title}`,
            description: item.description,
            dueAt: item.dueAt,
            sourceType: "import",
            priority: item.dueAt ? "high" : "medium",
          });
        }
        await insertNoteLocal(noteInput);
      }
    } else {
      await insertTaskLocal(taskInput);
      for (const item of normalizedItems) {
        await insertTaskLocal({
          title: `Entrega detectada: ${item.title}`,
          description: item.description,
          dueAt: item.dueAt,
          sourceType: "import",
          priority: item.dueAt ? "high" : "medium",
        });
      }
      await insertNoteLocal(noteInput);
    }

    return NextResponse.json({ ok: true, importedItems: normalizedItems.length });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
