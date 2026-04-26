"use server";

import { revalidatePath } from "next/cache";

import {
  deleteTask,
  insertTask,
  isSupabaseAdminConfigured,
  markTaskDone,
} from "@/lib/server/supabase-admin";
import { deleteTaskLocal, insertTaskLocal, markTaskDoneLocal } from "@/lib/server/local-store";

function asString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function createTaskAction(formData: FormData) {
  const title = asString(formData.get("title"));
  const description = asString(formData.get("description"));
  const dueAt = asString(formData.get("dueAt"));
  const priority = asString(formData.get("priority"));

  if (!title) {
    return;
  }

  const normalizedPriority =
    priority === "low" || priority === "medium" || priority === "high" || priority === "critical"
      ? priority
      : "medium";

  if (isSupabaseAdminConfigured()) {
    try {
      await insertTask({
        title,
        description,
        dueAt: dueAt || undefined,
        priority: normalizedPriority,
        sourceType: "manual",
      });
    } catch {
      await insertTaskLocal({
        title,
        description,
        dueAt: dueAt || undefined,
        priority: normalizedPriority,
        sourceType: "manual",
      });
    }
  } else {
    await insertTaskLocal({
      title,
      description,
      dueAt: dueAt || undefined,
      priority: normalizedPriority,
      sourceType: "manual",
    });
  }

  revalidatePath("/");
}

export async function markTaskDoneAction(formData: FormData) {
  const taskId = asString(formData.get("taskId"));

  if (!taskId) {
    return;
  }

  if (isSupabaseAdminConfigured()) {
    try {
      await markTaskDone(taskId);
      revalidatePath("/");
      return;
    } catch {
      // cae a modo local en el bloque siguiente
    }
  }
  await markTaskDoneLocal(taskId);
  revalidatePath("/");
}

export async function deleteTaskAction(formData: FormData) {
  const taskId = asString(formData.get("taskId"));

  if (!taskId) {
    return;
  }

  if (isSupabaseAdminConfigured()) {
    try {
      await deleteTask(taskId);
      revalidatePath("/");
      return;
    } catch {
      // cae a modo local en el bloque siguiente
    }
  }
  await deleteTaskLocal(taskId);
  revalidatePath("/");
}
