import type { Event, Exam, Priority, Project, ReminderStrategy, Task } from "@xio/shared/domain";

import type { DashboardData } from "./dashboard-data";

export type DashboardTaskView = {
  id: string;
  title: string;
  deadline: string;
  context: string;
  priority: Priority;
  reminderStrategy: ReminderStrategy;
};

export type TimelineItemView = {
  id: string;
  label: string;
  time: string;
  detail: string;
};

export type StudyRiskView = {
  id: string;
  exam: string;
  daysLeft: number;
  status: string;
};

export type DashboardViewModel = {
  tasks: DashboardTaskView[];
  timeline: TimelineItemView[];
  risks: StudyRiskView[];
  projects: Array<{
    id: string;
    title: string;
    progressPercent: number;
    dueLabel: string;
  }>;
  assistantPrompts: string[];
  metrics: {
    pendingTasks: number;
    examsAtRisk: number;
    projectsInProgress: number;
  };
};

const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
});

function formatDeadline(value?: string | null) {
  if (!value) return "Sin fecha";
  return dateFormatter.format(new Date(value));
}

function buildTaskContext(task: Task) {
  if (task.projectId) return "Proyecto o examen vinculado";
  if (task.sourceType === "manual") return "Pendiente personal";
  return "Pendiente importado";
}

function toTaskView(task: Task): DashboardTaskView {
  return {
    id: task.id,
    title: task.title,
    deadline: formatDeadline(task.dueAt),
    context: buildTaskContext(task),
    priority: task.priority,
    reminderStrategy: task.reminderStrategy,
  };
}

function toTimelineView(event: Event): TimelineItemView {
  return {
    id: event.id,
    label: event.title,
    time: dateFormatter.format(new Date(event.startsAt)),
    detail: [event.location, event.description].filter(Boolean).join(" · "),
  };
}

function calculateDaysLeft(exam: Exam, generatedAt: string) {
  const diffMs = new Date(exam.examAt).getTime() - new Date(generatedAt).getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function toRiskView(exam: Exam, generatedAt: string): StudyRiskView {
  const daysLeft = calculateDaysLeft(exam, generatedAt);
  const status =
    exam.studyPlanStatus === "missing"
      ? "Sin plan de estudio"
      : exam.studyPlanStatus === "planned"
        ? "Plan creado, falta ejecutar"
        : "Seguimiento activo";

  return {
    id: exam.id,
    exam: exam.title,
    daysLeft,
    status,
  };
}

function toProjectView(project: Project) {
  return {
    id: project.id,
    title: project.title,
    progressPercent: project.progressPercent,
    dueLabel: formatDeadline(project.dueAt),
  };
}

function buildAssistantPrompts(data: DashboardData) {
  const prompts: string[] = [];

  if (data.exams.some((exam) => exam.studyPlanStatus === "missing")) {
    prompts.push("Arma un plan de estudio para mi próximo examen.");
  }

  if (data.tasks.some((task) => task.priority === "critical")) {
    prompts.push("Dime qué tarea crítica debo atacar primero.");
  }

  if (data.events.length > 0) {
    prompts.push("Resúmeme mi agenda de hoy en 3 líneas.");
  }

  return prompts;
}

export function buildDashboardViewModel(data: DashboardData): DashboardViewModel {
  const pendingTasks = data.tasks.filter((task) => task.status !== "done").length;
  const examsAtRisk = data.exams.filter((exam) => exam.studyPlanStatus === "missing").length;
  const projectsInProgress = data.projects.filter((project) => project.status === "active").length;

  return {
    tasks: data.tasks.map(toTaskView),
    timeline: data.events.map(toTimelineView),
    risks: data.exams.map((exam) => toRiskView(exam, data.generatedAt)),
    projects: data.projects.map(toProjectView),
    assistantPrompts: buildAssistantPrompts(data),
    metrics: {
      pendingTasks,
      examsAtRisk,
      projectsInProgress,
    },
  };
}
