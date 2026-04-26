import { NextResponse } from "next/server";

import { insertEvents, insertReminders, isSupabaseAdminConfigured } from "@/lib/server/supabase-admin";
import { insertEventsLocal, insertRemindersLocal } from "@/lib/server/local-store";

type ScheduleItem = {
  day?: string;
  start?: string;
  end?: string;
  title?: string;
  location?: string;
};

const DAY_TO_INDEX: Record<string, number> = {
  lunes: 1,
  lun: 1,
  martes: 2,
  mar: 2,
  miercoles: 3,
  miércoles: 3,
  mier: 3,
  mie: 3,
  jueves: 4,
  jue: 4,
  viernes: 5,
  vie: 5,
  sabado: 6,
  sábado: 6,
  sab: 6,
  domingo: 0,
  dom: 0,
};
const WEEKS_TO_GENERATE = 8;
const REMINDER_OFFSET_MINUTES = 60;

function normalizeDay(day: string) {
  return day
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function normalizeTime(value: string) {
  const match = value.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?$/i);
  if (!match) {
    return null;
  }

  const hours = Number.parseInt(match[1] ?? "", 10);
  const minutes = Number.parseInt(match[2] ?? "0", 10);
  const marker = (match[3] ?? "").toLowerCase();

  let normalizedHours = hours;
  if (marker === "am" && normalizedHours === 12) {
    normalizedHours = 0;
  }
  if (marker === "pm" && normalizedHours < 12) {
    normalizedHours += 12;
  }

  if (normalizedHours > 23 || normalizedHours < 0 || minutes > 59 || minutes < 0) {
    return null;
  }

  return `${String(normalizedHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function parseTime(value: string) {
  const normalized = normalizeTime(value);
  if (!normalized) {
    return null;
  }

  const [hoursText, minutesText] = normalized.split(":");
  const hours = Number.parseInt(hoursText ?? "", 10);
  const minutes = Number.parseInt(minutesText ?? "", 10);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null;
  }

  return { hours, minutes };
}

function nextOccurrence(day: string, start: string) {
  const dayIndex = DAY_TO_INDEX[normalizeDay(day)];
  const time = parseTime(start);

  if (dayIndex == null || !time) {
    return null;
  }

  const now = new Date();
  const date = new Date(now);
  const currentDay = date.getDay();
  let diff = dayIndex - currentDay;

  if (diff < 0) {
    diff += 7;
  }

  date.setDate(date.getDate() + diff);
  date.setHours(time.hours, time.minutes, 0, 0);

  if (date <= now) {
    date.setDate(date.getDate() + 7);
  }

  return date;
}

function buildEndDate(startDate: Date, end: string) {
  const time = parseTime(end);
  if (!time) {
    return null;
  }

  const endDate = new Date(startDate);
  endDate.setHours(time.hours, time.minutes, 0, 0);

  if (endDate <= startDate) {
    return null;
  }

  return endDate;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { items?: ScheduleItem[] };
    const items = Array.isArray(body.items) ? body.items : [];

    if (items.length === 0) {
      return NextResponse.json({ error: "No hay horarios para importar." }, { status: 400 });
    }

    const validEvents: Array<{
      title: string;
      description: string;
      location: string | null;
      startsAt: string;
      endsAt: string;
      requiresTravel: boolean;
      sourceType: "import";
    }> = [];
    const skipped: Array<{ title: string; reason: string }> = [];

    for (const item of items) {
      const title = item.title?.trim();
      const day = item.day?.trim();
      const start = normalizeTime(item.start ?? "");
      const end = normalizeTime(item.end ?? "");

      if (!title || !day || !start || !end) {
        skipped.push({
          title: title ?? "Sin título",
          reason: "Faltan campos obligatorios.",
        });
        continue;
      }

      const startsAt = nextOccurrence(day, start);
      if (!startsAt) {
        skipped.push({
          title,
          reason: "No se pudo interpretar el día o la hora de inicio.",
        });
        continue;
      }

      const endsAt = buildEndDate(startsAt, end);
      if (!endsAt) {
        skipped.push({
          title,
          reason: "La hora final es inválida o termina antes de empezar.",
        });
        continue;
      }

      for (let weekOffset = 0; weekOffset < WEEKS_TO_GENERATE; weekOffset += 1) {
        const recurringStart = new Date(startsAt);
        const recurringEnd = new Date(endsAt);
        recurringStart.setDate(recurringStart.getDate() + weekOffset * 7);
        recurringEnd.setDate(recurringEnd.getDate() + weekOffset * 7);

        validEvents.push({
          title,
          description: `Importado desde imagen de horario. Día original: ${day}. Semana ${weekOffset + 1} de ${WEEKS_TO_GENERATE}.`,
          location: item.location?.trim() || null,
          startsAt: recurringStart.toISOString(),
          endsAt: recurringEnd.toISOString(),
          requiresTravel: item.location?.trim().toLowerCase() === "presencial",
          sourceType: "import",
        });
      }
    }

    validEvents.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

    if (validEvents.length === 0) {
      return NextResponse.json(
        {
          error: "No se pudo importar ningún bloque del horario.",
          skipped,
        },
        { status: 400 },
      );
    }

    let insertedEvents: Array<{ id: string; title: string; starts_at: string }> = [];
    if (isSupabaseAdminConfigured()) {
      try {
        insertedEvents = (await insertEvents({ events: validEvents })) as Array<{
          id: string;
          title: string;
          starts_at: string;
        }>;
      } catch {
        insertedEvents = await insertEventsLocal({ events: validEvents });
      }
    } else {
      insertedEvents = await insertEventsLocal({ events: validEvents });
    }

    const reminders = insertedEvents
      .map((event) => {
        const startsAt = new Date(event.starts_at);
        const remindAt = new Date(startsAt.getTime() - REMINDER_OFFSET_MINUTES * 60 * 1000);

        if (remindAt.getTime() <= Date.now()) {
          return null;
        }

        return {
          eventId: event.id,
          title: `Clase próxima: ${event.title}`,
          message: `E.S.M.E te recuerda que tu clase empieza en ${REMINDER_OFFSET_MINUTES} minutos.`,
          remindAt: remindAt.toISOString(),
          source: "auto" as const,
          kind: "alert" as const,
        };
      })
      .filter((reminder): reminder is NonNullable<typeof reminder> => Boolean(reminder));

    if (reminders.length > 0) {
      if (isSupabaseAdminConfigured()) {
        try {
          await insertReminders({ reminders });
        } catch {
          await insertRemindersLocal({ reminders });
        }
      } else {
        await insertRemindersLocal({ reminders });
      }
    }

    return NextResponse.json({
      ok: true,
      imported: validEvents.length,
      remindersCreated: reminders.length,
      skipped,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
