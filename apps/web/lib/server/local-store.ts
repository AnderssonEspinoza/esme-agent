import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
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
const STORE_TMP_FILE = path.join(STORE_DIR, "store.tmp.json");
let storeQueue: Promise<void> = Promise.resolve();

function withStoreLock<T>(operation: () => Promise<T>) {
  const task = storeQueue.then(operation, operation);
  storeQueue = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}

function withNullsLastDateSort<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  return [...rows].sort((a, b) => {
    const left = typeof a[key] === "string" ? Date.parse(String(a[key])) : Number.POSITIVE_INFINITY;
    const right = typeof b[key] === "string" ? Date.parse(String(b[key])) : Number.POSITIVE_INFINITY;
    return left - right;
  });
}

function createInitialStore() {
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
  return initial;
}

async function ensureStoreUnlocked(): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true });

  try {
    await readFile(STORE_FILE, "utf8");
  } catch {
    const initial = createInitialStore();
    await writeFile(STORE_FILE, JSON.stringify(initial, null, 2), "utf8");
  }
}

function extractFirstJsonObject(raw: string) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  let start = -1;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      if (depth === 0) {
        start = index;
      }
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        return raw.slice(start, index + 1);
      }
    }
  }

  return null;
}

function parseStoreSafely(raw: string) {
  try {
    return JSON.parse(raw) as LocalStore;
  } catch {
    const recovered = extractFirstJsonObject(raw);
    if (!recovered) {
      return null;
    }
    try {
      return JSON.parse(recovered) as LocalStore;
    } catch {
      return null;
    }
  }
}

async function readStoreUnlocked(): Promise<LocalStore> {
  await ensureStoreUnlocked();
  const raw = await readFile(STORE_FILE, "utf8");
  const parsed = parseStoreSafely(raw);

  if (parsed) {
    if (JSON.stringify(parsed) !== raw.trim()) {
      // Reescribe el archivo si detectamos basura extra al final.
      await writeStoreUnlocked(parsed);
    }
    return parsed;
  }

  const fallback = createInitialStore();
  await writeStoreUnlocked(fallback);
  return fallback;
}

async function writeStoreUnlocked(data: LocalStore): Promise<void> {
  await ensureStoreUnlocked();
  const content = JSON.stringify(data, null, 2);
  await writeFile(STORE_TMP_FILE, content, "utf8");
  await rename(STORE_TMP_FILE, STORE_FILE);
}

async function mutateStore<T>(updater: (store: LocalStore) => T | Promise<T>) {
  return withStoreLock(async () => {
    const store = await readStoreUnlocked();
    const result = await updater(store);
    await writeStoreUnlocked(store);
    return result;
  });
}

async function readStore() {
  return withStoreLock(async () => readStoreUnlocked());
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
  return mutateStore((store) => {
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
    return [row];
  });
}

export async function markTaskDoneLocal(taskId: string) {
  await mutateStore((store) => {
    const now = new Date().toISOString();
    store.tasks = store.tasks.map((task) =>
      task.id === taskId
        ? { ...task, status: "done", completed_at: now, updated_at: now }
        : task,
    );
  });
}

export async function deleteTaskLocal(taskId: string) {
  await mutateStore((store) => {
    store.tasks = store.tasks.filter((task) => task.id !== taskId);
  });
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
  return mutateStore((store) => {
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
    return rows;
  });
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
  return mutateStore((store) => {
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
    return rows;
  });
}

export async function insertNoteLocal(input: { title?: string; content: string }) {
  return mutateStore((store) => {
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
    return [row];
  });
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
  await mutateStore((store) => {
    const now = new Date().toISOString();
    store.reminders = store.reminders.map((reminder) =>
      reminder.id === reminderId
        ? { ...reminder, status: "sent", sent_at: now, updated_at: now }
        : reminder,
    );
  });
}
