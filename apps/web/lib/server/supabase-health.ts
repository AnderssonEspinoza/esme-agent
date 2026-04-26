import { env } from "./env";
import { isSupabaseAdminConfigured } from "./supabase-admin";

type HealthRow = {
  count: number;
};

async function headRequest(path: string, serviceRoleKey: string) {
  const response = await fetch(`${env.supabaseUrl}/rest/v1/${path}`, {
    method: "GET",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: "count=exact",
      Range: "0-0",
    },
    cache: "no-store",
  });

  return response;
}

export async function getSupabaseHealth() {
  if (!isSupabaseAdminConfigured() || !env.supabaseServiceRoleKey || !env.supabaseUrl) {
    return {
      ok: false,
      reason: "Supabase admin no configurado.",
      checks: [],
    };
  }

  const checks = await Promise.all(
    ["profiles", "tasks", "events", "exams", "projects", "reminders"].map(async (table) => {
      try {
        const response = await headRequest(`${table}?select=*`, env.supabaseServiceRoleKey!);
        return {
          table,
          ok: response.ok,
          status: response.status,
        };
      } catch (error) {
        return {
          table,
          ok: false,
          status: 500,
          error: String(error),
        };
      }
    }),
  );

  return {
    ok: checks.every((item) => item.ok),
    reason: checks.every((item) => item.ok) ? "Supabase operativo." : "Hay tablas o credenciales con problema.",
    checks,
  };
}

