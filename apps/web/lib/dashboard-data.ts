import type { DeliveryChannel, Event, Exam, Project, Task } from "@xio/shared/domain";
import { DEFAULT_NOTIFICATION_RULES } from "@xio/shared/reminder-defaults";

export type DashboardData = {
  tasks: Task[];
  events: Event[];
  exams: Exam[];
  projects: Project[];
  activeChannels: DeliveryChannel[];
  generatedAt: string;
};

const now = "2026-03-23T18:00:00.000Z";

const tasks: Task[] = [
  {
    id: "task-1",
    profileId: "profile-1",
    projectId: "project-1",
    title: "Repasar seguridad de redes",
    description: "Tema central para el parcial.",
    status: "active",
    priority: "high",
    dueAt: "2026-03-23T20:00:00.000Z",
    scheduledFor: "2026-03-23T19:00:00.000Z",
    completedAt: null,
    isAllDay: false,
    isImportant: true,
    reminderStrategy: "auto",
    sourceType: "manual",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "task-2",
    profileId: "profile-1",
    projectId: null,
    title: "Actualizar CV para postular en LinkedIn",
    description: "Ajustar resumen y stack.",
    status: "active",
    priority: "medium",
    dueAt: "2026-03-23T21:30:00.000Z",
    scheduledFor: "2026-03-23T21:00:00.000Z",
    completedAt: null,
    isAllDay: false,
    isImportant: false,
    reminderStrategy: "auto",
    sourceType: "manual",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "task-3",
    profileId: "profile-1",
    projectId: null,
    title: "Confirmar materiales de obra para mañana",
    description: "Validar cemento, arena y traslado.",
    status: "scheduled",
    priority: "critical",
    dueAt: "2026-03-24T11:30:00.000Z",
    scheduledFor: "2026-03-24T10:30:00.000Z",
    completedAt: null,
    isAllDay: false,
    isImportant: true,
    reminderStrategy: "auto",
    sourceType: "manual",
    createdAt: now,
    updatedAt: now,
  },
];

const events: Event[] = [
  {
    id: "event-1",
    profileId: "profile-1",
    title: "Clase en universidad",
    description: "Redes y seguridad",
    location: "Aula B204",
    startsAt: "2026-03-23T23:00:00.000Z",
    endsAt: "2026-03-24T01:00:00.000Z",
    requiresTravel: true,
    status: "scheduled",
    reminderStrategy: "auto",
    sourceType: "manual",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "event-2",
    profileId: "profile-1",
    title: "Bloque de estudio",
    description: "VPN, cifrado y control de acceso",
    location: "Casa",
    startsAt: "2026-03-24T01:00:00.000Z",
    endsAt: "2026-03-24T02:15:00.000Z",
    requiresTravel: false,
    status: "scheduled",
    reminderStrategy: "auto",
    sourceType: "assistant",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "event-3",
    profileId: "profile-1",
    title: "Revisar postulaciones",
    description: "LinkedIn y portales tech",
    location: "Laptop",
    startsAt: "2026-03-24T02:15:00.000Z",
    endsAt: "2026-03-24T02:45:00.000Z",
    requiresTravel: false,
    status: "scheduled",
    reminderStrategy: "auto",
    sourceType: "manual",
    createdAt: now,
    updatedAt: now,
  },
];

const exams: Exam[] = [
  {
    id: "exam-1",
    profileId: "profile-1",
    projectId: "project-1",
    courseName: "Redes",
    title: "Examen parcial de Redes",
    description: "Temas de seguridad y VPN.",
    examAt: "2026-03-27T19:00:00.000Z",
    location: "Campus central",
    status: "scheduled",
    priority: "high",
    studyPlanStatus: "missing",
    reminderStrategy: "auto",
    sourceType: "manual",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "exam-2",
    profileId: "profile-1",
    projectId: "project-1",
    courseName: "Proyecto Integrador",
    title: "Entrega de proyecto final",
    description: "Aún falta dividir tareas.",
    examAt: "2026-04-01T23:00:00.000Z",
    location: "Portal virtual",
    status: "scheduled",
    priority: "critical",
    studyPlanStatus: "planned",
    reminderStrategy: "auto",
    sourceType: "portal",
    createdAt: now,
    updatedAt: now,
  },
];

const projects: Project[] = [
  {
    id: "project-1",
    profileId: "profile-1",
    title: "Ciclo universidad marzo",
    description: "Seguimiento de exámenes y entregas.",
    status: "active",
    priority: "high",
    startsAt: "2026-03-01T13:00:00.000Z",
    dueAt: "2026-04-01T23:00:00.000Z",
    progressPercent: 46,
    createdAt: now,
    updatedAt: now,
  },
];

const activeChannels: DeliveryChannel[] = ["mobile_push", "desktop", "web_push"];

export async function getDashboardData(): Promise<DashboardData> {
  return {
    tasks,
    events,
    exams,
    projects,
    activeChannels,
    generatedAt: now,
  };
}

export function getReminderRuleSummary() {
  return {
    total: DEFAULT_NOTIFICATION_RULES.length,
    taskRules: DEFAULT_NOTIFICATION_RULES.filter((rule) => rule.entityType === "task").length,
    examRules: DEFAULT_NOTIFICATION_RULES.filter((rule) => rule.entityType === "exam").length,
  };
}

