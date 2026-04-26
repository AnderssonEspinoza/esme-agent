create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  full_name text,
  timezone text not null default 'America/Lima',
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'active' check (status in ('draft', 'active', 'done', 'overdue', 'archived')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  starts_at timestamptz,
  due_at timestamptz,
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'active' check (status in ('draft', 'scheduled', 'active', 'done', 'overdue', 'archived')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  due_at timestamptz,
  scheduled_for timestamptz,
  completed_at timestamptz,
  is_all_day boolean not null default false,
  is_important boolean not null default false,
  reminder_strategy text not null default 'auto' check (reminder_strategy in ('none', 'manual', 'auto')),
  source_type text not null default 'manual' check (source_type in ('manual', 'portal', 'calendar', 'import', 'assistant')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  requires_travel boolean not null default false,
  status text not null default 'scheduled' check (status in ('draft', 'scheduled', 'done', 'cancelled', 'archived')),
  reminder_strategy text not null default 'auto' check (reminder_strategy in ('none', 'manual', 'auto')),
  source_type text not null default 'manual' check (source_type in ('manual', 'portal', 'calendar', 'import', 'assistant')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  course_name text not null,
  title text not null,
  description text,
  exam_at timestamptz not null,
  location text,
  status text not null default 'scheduled' check (status in ('draft', 'scheduled', 'done', 'missed', 'archived')),
  priority text not null default 'high' check (priority in ('low', 'medium', 'high', 'critical')),
  study_plan_status text not null default 'missing' check (study_plan_status in ('missing', 'planned', 'in_progress', 'completed')),
  reminder_strategy text not null default 'auto' check (reminder_strategy in ('none', 'manual', 'auto')),
  source_type text not null default 'manual' check (source_type in ('manual', 'portal', 'calendar', 'import', 'assistant')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  task_id uuid references tasks(id) on delete cascade,
  exam_id uuid references exams(id) on delete cascade,
  title text,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  task_id uuid references tasks(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  exam_id uuid references exams(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  source text not null default 'auto' check (source in ('auto', 'manual', 'rescue', 'system')),
  kind text not null default 'alert' check (kind in ('alert', 'rescue', 'summary', 'follow_up')),
  title text not null,
  message text,
  remind_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'delivered', 'failed', 'dismissed', 'snoozed', 'cancelled')),
  snoozed_until timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    ((task_id is not null)::int +
     (event_id is not null)::int +
     (exam_id is not null)::int +
     (project_id is not null)::int) = 1
  )
);

create table if not exists notification_rules (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  entity_type text not null check (entity_type in ('task', 'event', 'exam', 'project')),
  trigger_type text not null check (trigger_type in ('before_due', 'same_day', 'overdue', 'weekly_check', 'custom')),
  offset_minutes integer,
  is_enabled boolean not null default true,
  max_retries integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references reminders(id) on delete cascade,
  channel text not null check (channel in ('mobile_push', 'web_push', 'desktop', 'email', 'telegram')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'delivered', 'failed')),
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('manual', 'portal', 'calendar', 'linkedin', 'gmail', 'assistant')),
  label text not null,
  status text not null default 'disconnected' check (status in ('connected', 'disconnected', 'error')),
  last_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_profile_due_at on projects(profile_id, due_at);
create index if not exists idx_tasks_profile_status_due_at on tasks(profile_id, status, due_at);
create index if not exists idx_events_profile_starts_at on events(profile_id, starts_at);
create index if not exists idx_exams_profile_exam_at on exams(profile_id, exam_at);
create index if not exists idx_reminders_profile_status_remind_at on reminders(profile_id, status, remind_at);
create index if not exists idx_notification_rules_profile_entity on notification_rules(profile_id, entity_type);

