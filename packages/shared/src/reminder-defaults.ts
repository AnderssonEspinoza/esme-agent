import type { NotificationRule } from "./domain";

export const DEFAULT_NOTIFICATION_RULES: Array<
  Omit<NotificationRule, "id" | "profileId" | "createdAt" | "updatedAt">
> = [
  {
    entityType: "task",
    triggerType: "before_due",
    offsetMinutes: 60,
    isEnabled: true,
    maxRetries: 1,
  },
  {
    entityType: "event",
    triggerType: "before_due",
    offsetMinutes: 60,
    isEnabled: true,
    maxRetries: 0,
  },
  {
    entityType: "exam",
    triggerType: "before_due",
    offsetMinutes: 10080,
    isEnabled: true,
    maxRetries: 0,
  },
  {
    entityType: "exam",
    triggerType: "before_due",
    offsetMinutes: 4320,
    isEnabled: true,
    maxRetries: 0,
  },
  {
    entityType: "exam",
    triggerType: "before_due",
    offsetMinutes: 1440,
    isEnabled: true,
    maxRetries: 0,
  },
  {
    entityType: "project",
    triggerType: "before_due",
    offsetMinutes: 10080,
    isEnabled: true,
    maxRetries: 0,
  },
  {
    entityType: "project",
    triggerType: "before_due",
    offsetMinutes: 4320,
    isEnabled: true,
    maxRetries: 0,
  },
  {
    entityType: "project",
    triggerType: "before_due",
    offsetMinutes: 1440,
    isEnabled: true,
    maxRetries: 0,
  },
  {
    entityType: "task",
    triggerType: "overdue",
    offsetMinutes: 30,
    isEnabled: true,
    maxRetries: 1,
  },
  {
    entityType: "project",
    triggerType: "weekly_check",
    offsetMinutes: null,
    isEnabled: true,
    maxRetries: 0,
  },
];

