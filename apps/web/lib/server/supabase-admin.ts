import { env, requireEnv } from "./env";
import type { DashboardData } from "@/lib/dashboard-data";

export const DEFAULT_PROFILE_ID = "11111111-1111-1111-1111-111111111111";

function createUrl(path: string) {
  return `${requireEnv("supabaseUrl")}/rest/v1/${path}`;
}

function headers(prefer = "return=representation") {
  const serviceKey = requireEnv("supabaseServiceRoleKey");
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    Prefer: prefer,
  };
}

export function isSupabaseAdminConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}

async function fetchTable(path: string) {
  const response = await fetch(createUrl(path), {
    headers: {
      apikey: requireEnv("supabaseServiceRoleKey"),
      Authorization: `Bearer ${requireEnv("supabaseServiceRoleKey")}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Supabase fetch failed: ${response.status}`);
  }

  return response.json();
}

async function upsertRows<T>(table: string, rows: T[], onConflict = "id") {
  if (rows.length === 0) {
    return [];
  }

  const response = await fetch(createUrl(`${table}?on_conflict=${onConflict}`), {
    method: "POST",
    headers: headers("resolution=merge-duplicates,return=representation"),
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    throw new Error(`Supabase upsert ${table} failed: ${response.status}`);
  }

  return response.json();
}

export async function insertTask(input: {
  title: string;
  description?: string;
  sourceType?: "manual" | "portal" | "calendar" | "import" | "assistant";
  priority?: "low" | "medium" | "high" | "critical";
  dueAt?: string | null;
}) {
  const response = await fetch(createUrl("tasks"), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      profile_id: DEFAULT_PROFILE_ID,
      title: input.title,
      description: input.description ?? null,
      status: "active",
      priority: input.priority ?? "medium",
      due_at: input.dueAt ?? null,
      scheduled_for: input.dueAt ?? null,
      is_all_day: false,
      is_important: input.priority === "high" || input.priority === "critical",
      reminder_strategy: "auto",
      source_type: input.sourceType ?? "manual",
    }),
  });

  if (!response.ok) {
    throw new Error(`Supabase insert task failed: ${response.status}`);
  }

  return response.json();
}

export async function markTaskDone(taskId: string) {
  const response = await fetch(createUrl(`tasks?id=eq.${taskId}`), {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({
      status: "done",
      completed_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Supabase patch task failed: ${response.status}`);
  }

  return response.json();
}

export async function deleteTask(taskId: string) {
  const response = await fetch(createUrl(`tasks?id=eq.${taskId}`), {
    method: "DELETE",
    headers: headers(),
  });

  if (!response.ok) {
    throw new Error(`Supabase delete task failed: ${response.status}`);
  }

  return response.json();
}

export async function insertNote(input: {
  title?: string;
  content: string;
}) {
  const response = await fetch(createUrl("notes"), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      profile_id: DEFAULT_PROFILE_ID,
      title: input.title ?? null,
      content: input.content,
    }),
  });

  if (!response.ok) {
    throw new Error(`Supabase insert note failed: ${response.status}`);
  }

  return response.json();
}

export async function insertEvents(input: {
  events: Array<{
    title: string;
    description?: string | null;
    location?: string | null;
    startsAt: string;
    endsAt?: string | null;
    requiresTravel?: boolean;
    sourceType?: "manual" | "portal" | "calendar" | "import" | "assistant";
  }>;
}) {
  const payload = input.events.map((event) => ({
    profile_id: DEFAULT_PROFILE_ID,
    title: event.title,
    description: event.description ?? null,
    location: event.location ?? null,
    starts_at: event.startsAt,
    ends_at: event.endsAt ?? null,
    requires_travel: event.requiresTravel ?? false,
    status: "scheduled",
    reminder_strategy: "auto",
    source_type: event.sourceType ?? "import",
  }));

  const response = await fetch(createUrl("events"), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Supabase insert events failed: ${response.status}`);
  }

  return response.json();
}

export async function insertReminders(input: {
  reminders: Array<{
    title: string;
    message?: string | null;
    remindAt: string;
    eventId?: string | null;
    taskId?: string | null;
    examId?: string | null;
    projectId?: string | null;
    source?: "auto" | "manual" | "rescue" | "system";
    kind?: "alert" | "rescue" | "summary" | "follow_up";
  }>;
}) {
  const payload = input.reminders.map((reminder) => ({
    profile_id: DEFAULT_PROFILE_ID,
    task_id: reminder.taskId ?? null,
    event_id: reminder.eventId ?? null,
    exam_id: reminder.examId ?? null,
    project_id: reminder.projectId ?? null,
    source: reminder.source ?? "auto",
    kind: reminder.kind ?? "alert",
    title: reminder.title,
    message: reminder.message ?? null,
    remind_at: reminder.remindAt,
    status: "pending",
  }));

  const response = await fetch(createUrl("reminders"), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Supabase insert reminders failed: ${response.status}`);
  }

  return response.json();
}

export async function fetchDueReminders() {
  const now = encodeURIComponent(new Date().toISOString());
  const response = await fetch(
    createUrl(`reminders?select=*&status=eq.pending&remind_at=lte.${now}&order=remind_at.asc&limit=20`),
    {
      headers: {
        apikey: requireEnv("supabaseServiceRoleKey"),
        Authorization: `Bearer ${requireEnv("supabaseServiceRoleKey")}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Supabase fetch reminders failed: ${response.status}`);
  }

  return response.json();
}

export async function markReminderSent(reminderId: string) {
  const response = await fetch(createUrl(`reminders?id=eq.${reminderId}`), {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({
      status: "sent",
      sent_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Supabase patch reminder failed: ${response.status}`);
  }

  return response.json();
}

export async function fetchDashboardRows() {
  const [tasks, events, exams, projects] = await Promise.all([
    fetchTable("tasks?select=*&order=due_at.asc.nullslast&limit=20"),
    fetchTable("events?select=*&order=starts_at.asc&limit=20"),
    fetchTable("exams?select=*&order=exam_at.asc&limit=20"),
    fetchTable("projects?select=*&order=due_at.asc.nullslast&limit=20"),
  ]);

  return { tasks, events, exams, projects };
}

export async function seedDashboardData(data: DashboardData) {
  const profile = {
    id: DEFAULT_PROFILE_ID,
    email: "andersson@xio.local",
    full_name: "Andersson",
    timezone: "America/Lima",
  };

  await upsertRows("profiles", [profile]);
  await upsertRows(
    "projects",
    data.projects.map((project) => ({
      id: project.id,
      profile_id: DEFAULT_PROFILE_ID,
      title: project.title,
      description: project.description ?? null,
      status: project.status,
      priority: project.priority,
      starts_at: project.startsAt ?? null,
      due_at: project.dueAt ?? null,
      progress_percent: project.progressPercent,
      created_at: project.createdAt,
      updated_at: project.updatedAt,
    })),
  );
  await upsertRows(
    "tasks",
    data.tasks.map((task) => ({
      id: task.id,
      profile_id: DEFAULT_PROFILE_ID,
      project_id: task.projectId ?? null,
      title: task.title,
      description: task.description ?? null,
      status: task.status,
      priority: task.priority,
      due_at: task.dueAt ?? null,
      scheduled_for: task.scheduledFor ?? null,
      completed_at: task.completedAt ?? null,
      is_all_day: task.isAllDay,
      is_important: task.isImportant,
      reminder_strategy: task.reminderStrategy,
      source_type: task.sourceType,
      created_at: task.createdAt,
      updated_at: task.updatedAt,
    })),
  );
  await upsertRows(
    "events",
    data.events.map((event) => ({
      id: event.id,
      profile_id: DEFAULT_PROFILE_ID,
      title: event.title,
      description: event.description ?? null,
      location: event.location ?? null,
      starts_at: event.startsAt,
      ends_at: event.endsAt ?? null,
      requires_travel: event.requiresTravel,
      status: event.status,
      reminder_strategy: event.reminderStrategy,
      source_type: event.sourceType,
      created_at: event.createdAt,
      updated_at: event.updatedAt,
    })),
  );
  await upsertRows(
    "exams",
    data.exams.map((exam) => ({
      id: exam.id,
      profile_id: DEFAULT_PROFILE_ID,
      project_id: exam.projectId ?? null,
      course_name: exam.courseName,
      title: exam.title,
      description: exam.description ?? null,
      exam_at: exam.examAt,
      location: exam.location ?? null,
      status: exam.status,
      priority: exam.priority,
      study_plan_status: exam.studyPlanStatus,
      reminder_strategy: exam.reminderStrategy,
      source_type: exam.sourceType,
      created_at: exam.createdAt,
      updated_at: exam.updatedAt,
    })),
  );
}
