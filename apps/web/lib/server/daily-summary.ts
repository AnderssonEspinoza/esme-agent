import { fetchDashboardRows, isSupabaseAdminConfigured } from "./supabase-admin";
import { fetchDashboardRowsLocal } from "./local-store";

type DashboardRows = {
  tasks: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
};

function asText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asDate(value: unknown) {
  const text = asText(value);
  const date = text ? new Date(text) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

async function loadRows(): Promise<{ rows: DashboardRows; source: "local" | "supabase" }> {
  if (isSupabaseAdminConfigured()) {
    try {
      const rows = await fetchDashboardRows();
      return { rows, source: "supabase" };
    } catch {
      const rows = await fetchDashboardRowsLocal();
      return { rows, source: "local" };
    }
  }

  const rows = await fetchDashboardRowsLocal();
  return { rows, source: "local" };
}

export async function buildDailySummaryText() {
  const { rows, source } = await loadRows();
  const now = new Date();

  const todayEvents = rows.events
    .map((event) => ({
      title: asText(event.title, "Evento"),
      startsAt: asDate(event.starts_at ?? event.startsAt),
      location: asText(event.location),
    }))
    .filter((event) => event.startsAt && isSameDay(event.startsAt, now))
    .sort((a, b) => (a.startsAt?.getTime() ?? 0) - (b.startsAt?.getTime() ?? 0))
    .slice(0, 5);

  const pendingTasks = rows.tasks
    .filter((task) => {
      const status = asText(task.status);
      return status !== "done" && status !== "archived";
    })
    .map((task) => ({
      title: asText(task.title, "Pendiente"),
      dueAt: asDate(task.due_at ?? task.dueAt),
      priority: asText(task.priority, "medium"),
    }))
    .sort((a, b) => {
      const aDue = a.dueAt?.getTime() ?? Number.POSITIVE_INFINITY;
      const bDue = b.dueAt?.getTime() ?? Number.POSITIVE_INFINITY;
      return aDue - bDue;
    })
    .slice(0, 5);

  const lines: string[] = [];
  lines.push("E.S.M.E | Resumen de hoy");
  lines.push(`Fecha: ${now.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}`);
  lines.push(`Fuente: ${source === "supabase" ? "Supabase" : "Local"}`);
  lines.push("");

  if (todayEvents.length === 0) {
    lines.push("Agenda de hoy: sin eventos registrados.");
  } else {
    lines.push("Agenda de hoy:");
    todayEvents.forEach((event, index) => {
      const time = event.startsAt?.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }) ?? "--:--";
      lines.push(`${index + 1}. ${time} - ${event.title}${event.location ? ` (${event.location})` : ""}`);
    });
  }

  lines.push("");

  if (pendingTasks.length === 0) {
    lines.push("Pendientes: no hay tareas abiertas.");
  } else {
    lines.push("Top pendientes:");
    pendingTasks.forEach((task, index) => {
      const dueLabel = task.dueAt
        ? task.dueAt.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit" })
        : "sin fecha";
      lines.push(`${index + 1}. ${task.title} [${task.priority}] (${dueLabel})`);
    });
  }

  return lines.join("\n");
}
