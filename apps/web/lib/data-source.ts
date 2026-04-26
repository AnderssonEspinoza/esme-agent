import type { DashboardData } from "./dashboard-data";
import { getDashboardData } from "./dashboard-data";
import { getDashboardDataFromSupabaseRest } from "./supabase-rest";

export type DashboardDataSource = "seed" | "supabase";

export async function getDashboardDataFromSource(
  source: DashboardDataSource = "seed",
): Promise<DashboardData> {
  if (source === "supabase") {
    return getDashboardDataFromSupabase();
  }

  return getDashboardData();
}

async function getDashboardDataFromSupabase(): Promise<DashboardData> {
  const data = await getDashboardDataFromSupabaseRest();

  if (data) {
    return data;
  }

  return getDashboardData();
}
