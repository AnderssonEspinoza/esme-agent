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
