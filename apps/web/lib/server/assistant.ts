import {
  fetchDashboardRows,
  isSupabaseAdminConfigured,
  insertTask,
  markTaskDone,
} from "@/lib/server/supabase-admin";
import {
  fetchDashboardRowsLocal,
  insertTaskLocal,
  markTaskDoneLocal,
} from "@/lib/server/local-store";

type AssistantContext = {
  tasks: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
  exams: Array<Record<string, unknown>>;
  source: "local" | "supabase";
};

function asText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asDate(value: unknown) {
  const text = asText(value);
  const date = text ? new Date(text) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

async function loadAssistantContext(): Promise<AssistantContext> {
  if (isSupabaseAdminConfigured()) {
    try {
      const rows = await fetchDashboardRows();
      return {
        tasks: rows.tasks,
        events: rows.events,
        exams: rows.exams,
        source: "supabase",
      };
    } catch {
      // cae a local en el siguiente bloque
    }
  }

  const fallback = await fetchDashboardRowsLocal();
  return {
    tasks: fallback.tasks,
    events: fallback.events,
    exams: fallback.exams,
    source: "local",
  };
}

function getTodayEvents(events: AssistantContext["events"]) {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return events
    .filter((event) => {
      const start = asDate(event.starts_at ?? event.startsAt);
      return start && start >= now && start < tomorrow;
    })
    .sort((a, b) => {
      const aTime = asDate(a.starts_at ?? a.startsAt)?.getTime() ?? 0;
      const bTime = asDate(b.starts_at ?? b.startsAt)?.getTime() ?? 0;
      return aTime - bTime;
    });
}

function getPendingTasks(tasks: AssistantContext["tasks"]) {
  return tasks
    .filter((task) => {
      const status = asText(task.status);
      return status !== "done" && status !== "archived";
    })
    .sort((a, b) => {
      const aTime = asDate(a.due_at ?? a.dueAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = asDate(b.due_at ?? b.dueAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
}

function findTaskToComplete(tasks: AssistantContext["tasks"], message: string) {
  const normalized = message.toLowerCase();
  const marker =
    normalized.startsWith("completa ")
      ? "completa "
      : normalized.startsWith("marcar como hecho ")
        ? "marcar como hecho "
        : "";

  if (!marker) {
    return null;
  }

  const targetText = normalized.slice(marker.length).trim();
  if (!targetText) {
    return null;
  }

  const candidates = getPendingTasks(tasks);
  return (
    candidates.find((task) => asText(task.title).toLowerCase().includes(targetText)) ??
    null
  );
}

function parseSpanishDate(message: string) {
  const text = message.toLowerCase();
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
    const currentYear = new Date().getFullYear();
    const year = Number.parseInt(longMatch[3] ?? `${currentYear}`, 10);
    if (Number.isInteger(day) && month != null) {
      const candidate = new Date(year, month, day, 23, 0, 0, 0);
      if (candidate.getTime() < Date.now()) {
        candidate.setFullYear(candidate.getFullYear() + 1);
      }
      return candidate;
    }
  }

  const shortMatch = text.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (shortMatch) {
    const day = Number.parseInt(shortMatch[1] ?? "", 10);
    const month = Number.parseInt(shortMatch[2] ?? "", 10) - 1;
    const yearRaw = shortMatch[3];
    const baseYear = new Date().getFullYear();
    const year = yearRaw
      ? yearRaw.length === 2
        ? 2000 + Number.parseInt(yearRaw, 10)
        : Number.parseInt(yearRaw, 10)
      : baseYear;
    const candidate = new Date(year, month, day, 23, 0, 0, 0);
    if (!Number.isNaN(candidate.getTime())) {
      if (candidate.getTime() < Date.now()) {
        candidate.setFullYear(candidate.getFullYear() + 1);
      }
      return candidate;
    }
  }

  if (text.includes("mañana")) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(21, 0, 0, 0);
    return tomorrow;
  }

  return null;
}

function extractPlanSubject(message: string) {
  const normalized = message.trim();
  const markers = [" hasta ", " para ", " vence ", " entregar ", " entrega "];
  let cutIndex = normalized.length;

  for (const marker of markers) {
    const markerIndex = normalized.toLowerCase().indexOf(marker);
    if (markerIndex !== -1) {
      cutIndex = Math.min(cutIndex, markerIndex);
    }
  }

  const head = normalized.slice(0, cutIndex).trim();
  const clean = head
    .replace(/^tengo\s+/i, "")
    .replace(/^un\s+/i, "")
    .replace(/^una\s+/i, "")
    .replace(/^el\s+/i, "")
    .replace(/^la\s+/i, "")
    .trim();

  return clean || "pendiente importante";
}

function shouldCreateDeadlinePlan(message: string) {
  const normalized = message.toLowerCase();
  return (
    (normalized.includes("curso") ||
      normalized.includes("proyecto") ||
      normalized.includes("trabajo") ||
      normalized.includes("entrega")) &&
    (normalized.includes("hasta") ||
      normalized.includes("para") ||
      normalized.includes("vence") ||
      normalized.includes("entregar"))
  );
}

async function insertTaskWithFallback(input: {
  title: string;
  description: string;
  dueAt?: string;
  priority: "low" | "medium" | "high" | "critical";
}) {
  if (isSupabaseAdminConfigured()) {
    try {
      await insertTask({
        title: input.title,
        description: input.description,
        dueAt: input.dueAt,
        priority: input.priority,
        sourceType: "assistant",
      });
      return;
    } catch {
      // cae a local
    }
  }

  await insertTaskLocal({
    title: input.title,
    description: input.description,
    dueAt: input.dueAt,
    priority: input.priority,
    sourceType: "assistant",
  });
}

function getUpcomingExams(exams: AssistantContext["exams"]) {
  const now = Date.now();

  return exams
    .filter((exam) => {
      const examAt = asDate(exam.exam_at ?? exam.examAt)?.getTime() ?? 0;
      return examAt >= now;
    })
    .sort((a, b) => {
      const aTime = asDate(a.exam_at ?? a.examAt)?.getTime() ?? 0;
      const bTime = asDate(b.exam_at ?? b.examAt)?.getTime() ?? 0;
      return aTime - bTime;
    });
}

function formatDate(date: Date) {
  return date.toLocaleString("es-PE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildStudyReply(exams: AssistantContext["exams"], tasks: AssistantContext["tasks"]) {
  const nextExam = getUpcomingExams(exams)[0];
  const highPriorityTask = getPendingTasks(tasks).find((task) => {
    const priority = asText(task.priority);
    return priority === "high" || priority === "critical";
  });

  if (nextExam) {
    const title = asText(nextExam.title, "tu siguiente examen");
    const course = asText(nextExam.course_name ?? nextExam.courseName, "tu curso");
    const date = asDate(nextExam.exam_at ?? nextExam.examAt);
    return `Hoy te conviene priorizar ${course}. Tu siguiente evaluación es "${title}"${date ? ` el ${formatDate(date)}` : ""}.`;
  }

  if (highPriorityTask) {
    const due = asDate(highPriorityTask.due_at ?? highPriorityTask.dueAt);
    return `Lo más importante para estudiar ahora es "${asText(highPriorityTask.title, "tu pendiente principal")}"${due ? `, vence ${formatDate(due)}` : ""}.`;
  }

  return "Hoy no veo un examen urgente, así que te conviene avanzar el bloque más pesado que tengas pendiente y cerrar al menos una tarea crítica.";
}

function buildJobsReply(tasks: AssistantContext["tasks"]) {
  const jobItems = tasks.filter((task) => {
    const text = `${asText(task.title)} ${asText(task.description)}`.toLowerCase();
    return asText(task.source_type ?? task.sourceType) === "import" || text.includes("linkedin");
  });

  if (jobItems.length > 0) {
    return `Tengo ${jobItems.length} pendientes ligados a empleo. El más cercano es "${asText(jobItems[0]?.title, "tu vacante detectada")}".`;
  }

  return "Aún no veo vacantes guardadas en tu radar real. Si pegas una o usas la extensión, la incorporo aquí.";
}

function buildTodayReply(context: AssistantContext) {
  const todayEvents = getTodayEvents(context.events);
  const pendingTasks = getPendingTasks(context.tasks).slice(0, 2);

  const eventText =
    todayEvents.length > 0
      ? `Hoy te quedan ${todayEvents.length} bloques en agenda. El siguiente es "${asText(todayEvents[0]?.title, "tu siguiente evento")}"${asDate(todayEvents[0]?.starts_at ?? todayEvents[0]?.startsAt) ? ` a las ${asDate(todayEvents[0]?.starts_at ?? todayEvents[0]?.startsAt)?.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}` : ""}.`
      : "Hoy no veo más eventos en tu agenda.";

  const taskText =
    pendingTasks.length > 0
      ? `Tus pendientes más urgentes son ${pendingTasks.map((task) => `"${asText(task.title)}"`).join(" y ")}.`
      : "No veo tareas urgentes abiertas.";

  return `${eventText} ${taskText}`.trim();
}

export async function buildAssistantReply(message: string) {
  const normalized = message.toLowerCase();
  const context = await loadAssistantContext();
  const completionTarget = findTaskToComplete(context.tasks, message);

  if (normalized === "ayuda" || normalized.includes("que puedes hacer") || normalized.includes("qué puedes hacer")) {
    return {
      reply:
        'Puedo ayudarte con comandos reales: 1) "agrega pendiente ...", 2) "completa ...", 3) "resumen" o "agenda de hoy", 4) preguntas de estudio ("qué debo estudiar"), 5) empleo ("vacantes" o "linkedin").',
      source: context.source,
    };
  }

  if (completionTarget) {
    const taskId = asText(completionTarget.id);
    const taskTitle = asText(completionTarget.title, "esa tarea");

    if (taskId) {
      if (isSupabaseAdminConfigured()) {
        try {
          await markTaskDone(taskId);
        } catch {
          await markTaskDoneLocal(taskId);
        }
      } else {
        await markTaskDoneLocal(taskId);
      }
    }

    return {
      reply: `Listo, marqué como completada: "${taskTitle}".`,
      source: context.source,
    };
  }

  if (shouldCreateDeadlinePlan(message)) {
    const dueDate = parseSpanishDate(message);
    if (!dueDate) {
      return {
        reply: "Puedo armarte un plan automático, pero necesito una fecha clara. Ejemplo: 14 de junio.",
        source: context.source,
      };
    }

    const subject = extractPlanSubject(message);
    const daysLeft = Math.max(
      1,
      Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    );
    const priority = daysLeft <= 7 ? "high" : "medium";
    const dueAtIso = dueDate.toISOString();

    const milestones: Array<{ title: string; dueAt: string }> = [];
    const checkpointOffsets = [14, 7, 2];
    checkpointOffsets.forEach((offset) => {
      const checkpoint = new Date(dueDate);
      checkpoint.setDate(checkpoint.getDate() - offset);
      checkpoint.setHours(20, 0, 0, 0);
      if (checkpoint.getTime() > Date.now()) {
        milestones.push({
          title: `Avance ${subject} (${offset}d antes)`,
          dueAt: checkpoint.toISOString(),
        });
      }
    });

    await insertTaskWithFallback({
      title: `Completar: ${subject}`,
      description: `Plan automático creado por E.S.M.E. Fecha límite detectada: ${formatDate(dueDate)}.`,
      dueAt: dueAtIso,
      priority,
    });

    for (const milestone of milestones) {
      await insertTaskWithFallback({
        title: milestone.title,
        description: `Hito intermedio para no llegar tarde a: ${subject}.`,
        dueAt: milestone.dueAt,
        priority: "medium",
      });
    }

    return {
      reply: `Te armé un plan automático para "${subject}": 1 entrega final (${formatDate(dueDate)}) y ${milestones.length} hitos intermedios.`,
      source: context.source,
    };
  }

  if (
    normalized.includes("recuerd") ||
    normalized.includes("anota") ||
    normalized.includes("agrega") ||
    normalized.includes("pendiente")
  ) {
    if (isSupabaseAdminConfigured()) {
      try {
        await insertTask({
          title: message.trim(),
          description: "Creado desde la conversación con E.S.M.E.",
          priority: "medium",
          sourceType: "assistant",
        });
        return {
          reply: `Listo, ya lo guardé como tarea en XIO: "${message.trim()}". También te lo dejaré visible en tu panel.`,
          source: context.source,
        };
      } catch {
        // cae a local en el bloque siguiente
      }
    }

    await insertTaskLocal({
      title: message.trim(),
      description: "Creado desde la conversación con E.S.M.E.",
      priority: "medium",
      sourceType: "assistant",
    });
    return {
      reply: `Listo, ya lo guardé como tarea real en tu almacenamiento local: "${message.trim()}".`,
      source: context.source,
    };
  }

  if (normalized.includes("estudi") || normalized.includes("examen") || normalized.includes("univers")) {
    return {
      reply: buildStudyReply(context.exams, context.tasks),
      source: context.source,
    };
  }

  if (normalized.includes("trabajo") || normalized.includes("linkedin") || normalized.includes("vacante")) {
    return {
      reply: buildJobsReply(context.tasks),
      source: context.source,
    };
  }

  if (normalized.includes("hoy") || normalized.includes("resumen") || normalized.includes("agenda")) {
    return {
      reply: buildTodayReply(context),
      source: context.source,
    };
  }

  return {
    reply: `${buildTodayReply(context)} Si quieres, también puedo ayudarte con estudio, empleo o anotar un nuevo pendiente.`,
    source: context.source,
  };
}
