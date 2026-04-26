import { NextResponse } from "next/server";

import { getSupabaseHealth } from "@/lib/server/supabase-health";

export async function GET() {
  try {
    const result = await getSupabaseHealth();
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

