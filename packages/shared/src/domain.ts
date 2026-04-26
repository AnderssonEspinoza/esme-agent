export type Priority = "low" | "medium" | "high" | "critical";

export type TaskStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "done"
  | "overdue"
  | "archived";

export type EventStatus = "draft" | "scheduled" | "done" | "cancelled" | "archived";

export type ExamStatus = "draft" | "scheduled" | "done" | "missed" | "archived";

export type ProjectStatus = "draft" | "active" | "done" | "overdue" | "archived";

export type ReminderStrategy = "none" | "manual" | "auto";

export type SourceType = "manual" | "portal" | "calendar" | "import" | "assistant";

export type ReminderSource = "auto" | "manual" | "rescue" | "system";

export type ReminderKind = "alert" | "rescue" | "summary" | "follow_up";

export type ReminderStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "failed"
  | "dismissed"
  | "snoozed"
  | "cancelled";

export type DeliveryChannel = "mobile_push" | "web_push" | "desktop" | "email" | "telegram";

export type StudyPlanStatus = "missing" | "planned" | "in_progress" | "completed";

export interface Profile {
  id: string;
  email?: string | null;
  fullName?: string | null;
  timezone: string;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  profileId: string;
  title: string;
  description?: string | null;
  status: ProjectStatus;
  priority: Priority;
  startsAt?: string | null;
  dueAt?: string | null;
  progressPercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  profileId: string;
  projectId?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: Priority;
  dueAt?: string | null;
  scheduledFor?: string | null;
  completedAt?: string | null;
  isAllDay: boolean;
  isImportant: boolean;
  reminderStrategy: ReminderStrategy;
  sourceType: SourceType;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  profileId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: string;
  endsAt?: string | null;
  requiresTravel: boolean;
  status: EventStatus;
  reminderStrategy: ReminderStrategy;
  sourceType: SourceType;
  createdAt: string;
  updatedAt: string;
}

export interface Exam {
  id: string;
  profileId: string;
  projectId?: string | null;
  courseName: string;
  title: string;
  description?: string | null;
  examAt: string;
  location?: string | null;
  status: ExamStatus;
  priority: Priority;
  studyPlanStatus: StudyPlanStatus;
  reminderStrategy: ReminderStrategy;
  sourceType: SourceType;
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  profileId: string;
  taskId?: string | null;
  eventId?: string | null;
  examId?: string | null;
  projectId?: string | null;
  source: ReminderSource;
  kind: ReminderKind;
  title: string;
  message?: string | null;
  remindAt: string;
  status: ReminderStatus;
  snoozedUntil?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRule {
  id: string;
  profileId: string;
  entityType: "task" | "event" | "exam" | "project";
  triggerType: "before_due" | "same_day" | "overdue" | "weekly_check" | "custom";
  offsetMinutes?: number | null;
  isEnabled: boolean;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDelivery {
  id: string;
  reminderId: string;
  channel: DeliveryChannel;
  status: "pending" | "sent" | "delivered" | "failed";
  providerMessageId?: string | null;
  errorMessage?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
}

