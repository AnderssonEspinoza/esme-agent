import { NextResponse } from "next/server";

import {
  fetchDashboardRows,
  isSupabaseAdminConfigured,
} from "@/lib/server/supabase-admin";
import { fetchDashboardRowsLocal } from "@/lib/server/local-store";

type DashboardEntity = {
  id?: string | null;
  title?: string | null;
  priority?: string | null;
  status?: string | null;
  description?: string | null;
  location?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  due_at?: string | null;
  dueAt?: string | null;
  exam_at?: string | null;
  examAt?: string | null;
  course_name?: string | null;
  courseName?: string | null;
  starts_at?: string | null;
  startsAt?: string | null;
  ends_at?: string | null;
  endsAt?: string | null;
  source_type?: string | null;
  sourceType?: string | null;
  study_plan_status?: string | null;
  studyPlanStatus?: string | null;
};

type DashboardPayload = {
  tasks: DashboardEntity[];
  events: DashboardEntity[];
  exams: DashboardEntity[];
  projects: DashboardEntity[];
};

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function dayDiff(value: string) {
  const diffMs = new Date(value).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export async function GET() {
  try {
    if (isSupabaseAdminConfigured()) {
      try {
        const rows = await fetchDashboardRows();
        return NextResponse.json({
          ...buildViewPayload({
            tasks: rows.tasks,
            events: rows.events,
            exams: rows.exams,
            projects: rows.projects,
          }),
          source: "supabase",
        });
      } catch (error) {
        const localRows = await fetchDashboardRowsLocal();
        return NextResponse.json({
          ...buildViewPayload({
            tasks: localRows.tasks,
            events: localRows.events,
            exams: localRows.exams,
            projects: localRows.projects,
          }),
          source: "local",
          warning: `Supabase fallback: ${String(error)}`,
        });
      }
    }

    const localRows = await fetchDashboardRowsLocal();
    return NextResponse.json({
      ...buildViewPayload({
        tasks: localRows.tasks,
        events: localRows.events,
        exams: localRows.exams,
        projects: localRows.projects,
      }),
      source: "local",
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

function buildViewPayload(data: DashboardPayload) {
  const taskBoard = data.tasks
    .filter((task) => String(task.status ?? "active") !== "done" && String(task.status ?? "") !== "archived")
    .slice(0, 12)
    .map((task, index) => ({
      id: index + 1,
      taskId: String((task as { id?: string | null }).id ?? `task-${index + 1}`),
      title: String(task.title ?? "Pendiente"),
      priority: String(task.priority ?? "medium"),
      status: String(task.status ?? "active"),
      dueLabel: task.due_at || task.dueAt
        ? new Date(String(task.due_at ?? task.dueAt)).toLocaleString("es-PE", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Sin fecha",
      source: String(task.source_type ?? task.sourceType ?? "manual"),
    }));

  const deadlines = [
    ...data.exams.slice(0, 2).map((exam, index) => ({
      id: index + 1,
      title: String(exam.title ?? "Examen"),
      daysLeft: dayDiff(String(exam.exam_at ?? exam.examAt ?? new Date().toISOString())),
      type: index === 0 ? "danger" : "warning",
      subject: "Universidad",
    })),
    ...data.tasks
      .filter((task) => task.priority === "high" || task.priority === "critical")
      .slice(0, 1)
      .map((task, index) => ({
        id: 100 + index,
        title: String(task.title ?? "Pendiente"),
        daysLeft: dayDiff(String(task.due_at ?? task.dueAt ?? new Date().toISOString())),
        type: "info",
        subject: "Tareas",
      })),
  ];

  const jobs = data.tasks
    .filter(
      (task) =>
        String(task.source_type ?? task.sourceType ?? "") === "import" ||
        String(task.title ?? "").toLowerCase().includes("vacante") ||
        String(task.description ?? "").toLowerCase().includes("linkedin"),
    )
    .slice(0, 6)
    .map((task, index) => ({
      id: index + 1,
      company: "Radar XIO",
      role: String(task.title ?? "Vacante detectada"),
      status: String(task.status ?? "Pendiente"),
      date:
        task.created_at || task.createdAt
          ? new Date(String(task.created_at ?? task.createdAt)).toLocaleDateString("es-PE")
          : "-",
    }));

  const courses = data.exams.slice(0, 6).map((exam, index) => ({
    id: index + 1,
    name: String(exam.course_name ?? exam.courseName ?? "Curso"),
    progress: 20 + index * 15,
    nextTask: String(exam.title ?? "Evaluación"),
    grade: "--/20",
  }));

  const schedule = buildTodaySchedule(data.events);

  const weeklySchedule = buildWeeklySchedule(data.events);
  const universitySummary = buildUniversitySummary(data.exams);

  return {
    deadlines,
    taskBoard,
    jobs,
    courses,
    schedule,
    weeklySchedule,
    universitySummary,
  };
}

function formatTimeRange(start: string, end: string | null) {
  const startDate = new Date(start);
  const startText = startDate.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });

  if (!end) {
    return startText;
  }

  const endText = new Date(end).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
  return `${startText} - ${endText}`;
}

function eventStatus(start: string): "completed" | "current" | "pending" {
  const startTime = new Date(start).getTime();
  const now = Date.now();
  const diff = startTime - now;

  if (Math.abs(diff) < 1000 * 60 * 60) {
    return "current";
  }

  return diff < 0 ? "completed" : "pending";
}

function buildWeeklySchedule(events: DashboardEntity[]) {
  const now = new Date();
  const grouped = new Map<number, Array<{ title: string; time: string; status: "completed" | "current" | "pending"; location: string; startsAtMs: number }>>();

  for (const event of events) {
    const startText = String(event.starts_at ?? event.startsAt ?? "");
    const endText = event.ends_at || event.endsAt ? String(event.ends_at ?? event.endsAt) : null;
    const startsAt = new Date(startText);

    if (Number.isNaN(startsAt.getTime())) {
      continue;
    }

    const dayIndex = startsAt.getDay();
    const key = `${String(event.title ?? "")}-${formatTimeRange(startText, endText)}-${String(event.location ?? "")}`;
    const existing = grouped.get(dayIndex) ?? [];

    if (!existing.some((item) => `${item.title}-${item.time}-${item.location}` === key)) {
      existing.push({
        title: String(event.title ?? "Evento"),
        time: formatTimeRange(startText, endText),
        status: eventStatus(startText),
        location: String(event.location ?? ""),
        startsAtMs: startsAt.getTime(),
      });
    }

    existing.sort((a, b) => a.startsAtMs - b.startsAtMs);
    grouped.set(dayIndex, existing);
  }

  return DAY_ORDER.map((dayIndex) => ({
    dayLabel: DAY_LABELS[dayIndex] ?? "",
    dayNumber: null,
    isoDate: `${dayIndex}`,
    isToday: now.getDay() === dayIndex,
    items: (grouped.get(dayIndex) ?? []).map(({ startsAtMs: _startsAtMs, ...item }) => item),
  }));
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function buildTodaySchedule(events: DashboardEntity[]) {
  const now = new Date();

  return events
    .filter((event) => {
      const startsAt = new Date(String(event.starts_at ?? event.startsAt ?? ""));
      return !Number.isNaN(startsAt.getTime()) && isSameDay(startsAt, now);
    })
    .sort((a, b) => {
      const aTime = new Date(String(a.starts_at ?? a.startsAt ?? "")).getTime();
      const bTime = new Date(String(b.starts_at ?? b.startsAt ?? "")).getTime();
      return aTime - bTime;
    })
    .map((event) => ({
      time: formatTimeRange(
        String(event.starts_at ?? event.startsAt ?? new Date().toISOString()),
        event.ends_at || event.endsAt ? String(event.ends_at ?? event.endsAt) : null,
      ),
      task: String(event.title ?? "Evento"),
      status: eventStatus(String(event.starts_at ?? event.startsAt ?? new Date().toISOString())),
    }));
}

function buildUniversitySummary(exams: DashboardEntity[]) {
  const now = Date.now();
  const sevenDaysMs = 1000 * 60 * 60 * 24 * 7;

  const upcoming = exams.filter((exam) => {
    const examAt = new Date(String(exam.exam_at ?? exam.examAt ?? "")).getTime();
    return examAt >= now;
  });

  const urgent = upcoming.filter((exam) => {
    const examAt = new Date(String(exam.exam_at ?? exam.examAt ?? "")).getTime();
    return examAt - now <= sevenDaysMs;
  });

  const missingPlan = upcoming.filter((exam) => {
    const status = String((exam as { study_plan_status?: string; studyPlanStatus?: string }).study_plan_status ?? (exam as { studyPlanStatus?: string }).studyPlanStatus ?? "");
    return status === "missing";
  });

  return {
    upcomingCount: upcoming.length,
    urgentCount: urgent.length,
    missingPlanCount: missingPlan.length,
  };
}
