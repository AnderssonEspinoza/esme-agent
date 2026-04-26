import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { Priority, SourceType } from "@xio/shared/domain";

import { DEFAULT_PROFILE_ID } from "./supabase-admin";

type TaskRow = {
  id: string;
  profile_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: Priority;
  due_at: string | null;
  scheduled_for: string | null;
  completed_at: string | null;
  is_all_day: boolean;
  is_important: boolean;
  reminder_strategy: "none" | "manual" | "auto";
  source_type: SourceType;
  created_at: string;
  updated_at: string;
};

type EventRow = {
  id: string;
  profile_id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  requires_travel: boolean;
  status: "draft" | "scheduled" | "done" | "cancelled" | "archived";
  reminder_strategy: "none" | "manual" | "auto";
  source_type: SourceType;
  created_at: string;
  updated_at: string;
};

type ReminderRow = {
  id: string;
  profile_id: string;
  task_id: string | null;
  event_id: string | null;
  exam_id: string | null;
  project_id: string | null;
  source: "auto" | "manual" | "rescue" | "system";
  kind: "alert" | "rescue" | "summary" | "follow_up";
  title: string;
  message: string | null;
  remind_at: string;
  status: "pending" | "sent" | "delivered" | "failed" | "dismissed" | "snoozed" | "cancelled";
  snoozed_until: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
};

type LocalStore = {
  version: 1;
  profiles: Array<{
    id: string;
    email: string;
    full_name: string;
    timezone: string;
    created_at: string;
    updated_at: string;
  }>;
  tasks: TaskRow[];
  events: EventRow[];
  exams: Array<Record<string, unknown>>;
  projects: Array<Record<string, unknown>>;
  reminders: ReminderRow[];
  notes: Array<{
    id: string;
    profile_id: string;
    title: string | null;
    content: string;
    created_at: string;
    updated_at: string;
  }>;
};

const STORE_DIR = path.join(process.cwd(), ".xio-data");
const STORE_FILE = path.join(STORE_DIR, "store.json");

function withNullsLastDateSort<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  return [...rows].sort((a, b) => {
    const left = typeof a[key] === "string" ? Date.parse(String(a[key])) : Number.POSITIVE_INFINITY;
    const right = typeof b[key] === "string" ? Date.parse(String(b[key])) : Number.POSITIVE_INFINITY;
    return left - right;
  });
}

async function ensureStore(): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true });

  try {
    await readFile(STORE_FILE, "utf8");
  } catch {
    const now = new Date().toISOString();
    const initial: LocalStore = {
      version: 1,
      profiles: [
        {
          id: DEFAULT_PROFILE_ID,
          email: "local@xio.local",
          full_name: "Usuario local",
          timezone: "America/Lima",
          created_at: now,
          updated_at: now,
        },
      ],
      tasks: [],
      events: [],
      exams: [],
      projects: [],
      reminders: [],
      notes: [],
    };
    await writeFile(STORE_FILE, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readStore(): Promise<LocalStore> {
  await ensureStore();
  const raw = await readFile(STORE_FILE, "utf8");
  return JSON.parse(raw) as LocalStore;
}

async function writeStore(data: LocalStore): Promise<void> {
  await ensureStore();
  await writeFile(STORE_FILE, JSON.stringify(data, null, 2), "utf8");
}

export async function fetchDashboardRowsLocal() {
  const store = await readStore();
  return {
    tasks: withNullsLastDateSort(store.tasks, "due_at").slice(0, 20),
    events: withNullsLastDateSort(store.events, "starts_at").slice(0, 20),
    exams: withNullsLastDateSort(store.exams, "exam_at").slice(0, 20),
    projects: withNullsLastDateSort(store.projects, "due_at").slice(0, 20),
  };
}

export async function insertTaskLocal(input: {
  title: string;
  description?: string;
  sourceType?: SourceType;
  priority?: Priority;
  dueAt?: string | null;
}) {
  const store = await readStore();
  const now = new Date().toISOString();
  const row: TaskRow = {
    id: randomUUID(),
    profile_id: DEFAULT_PROFILE_ID,
    project_id: null,
    title: input.title,
    description: input.description ?? null,
    status: "active",
    priority: input.priority ?? "medium",
    due_at: input.dueAt ?? null,
    scheduled_for: input.dueAt ?? null,
    completed_at: null,
    is_all_day: false,
    is_important: input.priority === "high" || input.priority === "critical",
    reminder_strategy: "auto",
    source_type: input.sourceType ?? "manual",
    created_at: now,
    updated_at: now,
  };
  store.tasks.push(row);
  await writeStore(store);
  return [row];
}

export async function markTaskDoneLocal(taskId: string) {
  const store = await readStore();
  const now = new Date().toISOString();
  store.tasks = store.tasks.map((task) =>
    task.id === taskId
      ? { ...task, status: "done", completed_at: now, updated_at: now }
      : task,
  );
  await writeStore(store);
}

export async function deleteTaskLocal(taskId: string) {
  const store = await readStore();
  store.tasks = store.tasks.filter((task) => task.id !== taskId);
  await writeStore(store);
}

export async function insertEventsLocal(input: {
  events: Array<{
    title: string;
    description?: string | null;
    location?: string | null;
    startsAt: string;
    endsAt?: string | null;
    requiresTravel?: boolean;
    sourceType?: SourceType;
  }>;
}) {
  const store = await readStore();
  const now = new Date().toISOString();
  const rows = input.events.map((event) => ({
    id: randomUUID(),
    profile_id: DEFAULT_PROFILE_ID,
    title: event.title,
    description: event.description ?? null,
    location: event.location ?? null,
    starts_at: event.startsAt,
    ends_at: event.endsAt ?? null,
    requires_travel: event.requiresTravel ?? false,
    status: "scheduled" as const,
    reminder_strategy: "auto" as const,
    source_type: event.sourceType ?? "import",
    created_at: now,
    updated_at: now,
  }));
  store.events.push(...rows);
  await writeStore(store);
  return rows;
}

export async function insertRemindersLocal(input: {
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
  const store = await readStore();
  const now = new Date().toISOString();
  const rows = input.reminders.map((reminder) => ({
    id: randomUUID(),
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
    status: "pending" as const,
    snoozed_until: null,
    sent_at: null,
    delivered_at: null,
    created_at: now,
    updated_at: now,
  }));
  store.reminders.push(...rows);
  await writeStore(store);
  return rows;
}

export async function insertNoteLocal(input: { title?: string; content: string }) {
  const store = await readStore();
  const now = new Date().toISOString();
  const row = {
    id: randomUUID(),
    profile_id: DEFAULT_PROFILE_ID,
    title: input.title ?? null,
    content: input.content,
    created_at: now,
    updated_at: now,
  };
  store.notes.push(row);
  await writeStore(store);
  return [row];
}

export async function fetchDueRemindersLocal() {
  const now = Date.now();
  const store = await readStore();
  return store.reminders
    .filter((reminder) => reminder.status === "pending" && Date.parse(reminder.remind_at) <= now)
    .sort((a, b) => Date.parse(a.remind_at) - Date.parse(b.remind_at))
    .slice(0, 20);
}

export async function markReminderSentLocal(reminderId: string) {
  const store = await readStore();
  const now = new Date().toISOString();
  store.reminders = store.reminders.map((reminder) =>
    reminder.id === reminderId
      ? { ...reminder, status: "sent", sent_at: now, updated_at: now }
      : reminder,
  );
  await writeStore(store);
}
