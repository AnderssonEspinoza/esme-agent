import type { Event, Exam, Project, Task } from "@xio/shared/domain";

import type { DashboardData } from "./dashboard-data";

type SupabaseRow = Record<string, unknown>;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function isConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function isSupabaseConfigured() {
  return isConfigured();
}

function createTableUrl(table: string, query: string) {
  return `${SUPABASE_URL}/rest/v1/${table}?${query}`;
}

async function fetchRows(table: string, query: string): Promise<SupabaseRow[]> {
  if (!isConfigured()) {
    return [];
  }

  const response = await fetch(createTableUrl(table, query), {
    headers: {
      apikey: SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${SUPABASE_ANON_KEY!}`,
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed for ${table}: ${response.status}`);
  }

  return (await response.json()) as SupabaseRow[];
}

async function mutateTable(
  table: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: Record<string, unknown>,
  query = "",
) {
  if (!isConfigured()) {
    return null;
  }

  const url = query ? createTableUrl(table, query) : `${SUPABASE_URL}/rest/v1/${table}`;
  const response = await fetch(url, {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${SUPABASE_ANON_KEY!}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Supabase mutation failed for ${table}: ${response.status}`);
  }

  return response;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : fallback;
}

function mapTask(row: SupabaseRow): Task {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    projectId: asString(row.project_id),
    title: String(row.title),
    description: asString(row.description),
    status: String(row.status) as Task["status"],
    priority: String(row.priority) as Task["priority"],
    dueAt: asString(row.due_at),
    scheduledFor: asString(row.scheduled_for),
    completedAt: asString(row.completed_at),
    isAllDay: asBoolean(row.is_all_day),
    isImportant: asBoolean(row.is_important),
    reminderStrategy: String(row.reminder_strategy) as Task["reminderStrategy"],
    sourceType: String(row.source_type) as Task["sourceType"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapEvent(row: SupabaseRow): Event {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    title: String(row.title),
    description: asString(row.description),
    location: asString(row.location),
    startsAt: String(row.starts_at),
    endsAt: asString(row.ends_at),
    requiresTravel: asBoolean(row.requires_travel),
    status: String(row.status) as Event["status"],
    reminderStrategy: String(row.reminder_strategy) as Event["reminderStrategy"],
    sourceType: String(row.source_type) as Event["sourceType"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapExam(row: SupabaseRow): Exam {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    projectId: asString(row.project_id),
    courseName: String(row.course_name),
    title: String(row.title),
    description: asString(row.description),
    examAt: String(row.exam_at),
    location: asString(row.location),
    status: String(row.status) as Exam["status"],
    priority: String(row.priority) as Exam["priority"],
    studyPlanStatus: String(row.study_plan_status) as Exam["studyPlanStatus"],
    reminderStrategy: String(row.reminder_strategy) as Exam["reminderStrategy"],
    sourceType: String(row.source_type) as Exam["sourceType"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapProject(row: SupabaseRow): Project {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    title: String(row.title),
    description: asString(row.description),
    status: String(row.status) as Project["status"],
    priority: String(row.priority) as Project["priority"],
    startsAt: asString(row.starts_at),
    dueAt: asString(row.due_at),
    progressPercent: asNumber(row.progress_percent),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function getDashboardDataFromSupabaseRest(): Promise<DashboardData | null> {
  if (!isConfigured()) {
    return null;
  }

  const [taskRows, eventRows, examRows, projectRows] = await Promise.all([
    fetchRows("tasks", "select=*&order=due_at.asc.nullslast&limit=6"),
    fetchRows("events", "select=*&order=starts_at.asc&limit=6"),
    fetchRows("exams", "select=*&order=exam_at.asc&limit=6"),
    fetchRows("projects", "select=*&order=due_at.asc.nullslast&limit=4"),
  ]);

  return {
    tasks: taskRows.map(mapTask),
    events: eventRows.map(mapEvent),
    exams: examRows.map(mapExam),
    projects: projectRows.map(mapProject),
    activeChannels: ["mobile_push", "desktop", "web_push"],
    generatedAt: new Date().toISOString(),
  };
}

type CreateTaskInput = {
  title: string;
  description?: string;
  dueAt?: string;
  priority?: Task["priority"];
};

const DEFAULT_PROFILE_ID = "11111111-1111-1111-1111-111111111111";

export async function createTaskInSupabase(input: CreateTaskInput) {
  const response = await mutateTable("tasks", "POST", {
    profile_id: DEFAULT_PROFILE_ID,
    title: input.title,
    description: input.description || null,
    status: "active",
    priority: input.priority ?? "medium",
    due_at: input.dueAt || null,
    scheduled_for: input.dueAt || null,
    is_all_day: false,
    is_important: input.priority === "critical" || input.priority === "high",
    reminder_strategy: "auto",
    source_type: "manual",
  });

  return Boolean(response);
}

export async function markTaskDoneInSupabase(taskId: string) {
  const response = await mutateTable(
    "tasks",
    "PATCH",
    {
      status: "done",
      completed_at: new Date().toISOString(),
    },
    `id=eq.${taskId}`,
  );

  return Boolean(response);
}

export async function deleteTaskInSupabase(taskId: string) {
  const response = await mutateTable("tasks", "DELETE", undefined, `id=eq.${taskId}`);
  return Boolean(response);
}
