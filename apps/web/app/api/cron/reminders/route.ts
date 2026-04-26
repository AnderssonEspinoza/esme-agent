import { NextResponse } from "next/server";

import { fetchDueReminders, isSupabaseAdminConfigured, markReminderSent } from "@/lib/server/supabase-admin";
import { fetchDueRemindersLocal, markReminderSentLocal } from "@/lib/server/local-store";
import { isTelegramConfigured, sendTelegramMessage } from "@/lib/server/telegram";

export async function GET() {
  try {
    if (!isTelegramConfigured()) {
      return NextResponse.json({ error: "Telegram no configurado." }, { status: 400 });
    }

    let reminders: Array<{
      id: string;
      title: string;
      message?: string | null;
    }> = [];

    if (isSupabaseAdminConfigured()) {
      try {
        reminders = (await fetchDueReminders()) as Array<{
          id: string;
          title: string;
          message?: string | null;
        }>;
      } catch {
        reminders = await fetchDueRemindersLocal();
      }
    } else {
      reminders = await fetchDueRemindersLocal();
    }

    for (const reminder of reminders) {
      await sendTelegramMessage(`XIO: ${reminder.title}${reminder.message ? `\n${reminder.message}` : ""}`);
      if (isSupabaseAdminConfigured()) {
        try {
          await markReminderSent(reminder.id);
        } catch {
          await markReminderSentLocal(reminder.id);
        }
      } else {
        await markReminderSentLocal(reminder.id);
      }
    }

    return NextResponse.json({ ok: true, sent: reminders.length });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
