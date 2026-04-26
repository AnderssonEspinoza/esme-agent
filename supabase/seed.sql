insert into profiles (id, email, full_name, timezone)
values
  ('11111111-1111-1111-1111-111111111111', 'andersson@example.com', 'Andersson', 'America/Lima')
on conflict (id) do nothing;

insert into projects (
  id,
  profile_id,
  title,
  description,
  status,
  priority,
  starts_at,
  due_at,
  progress_percent
)
values
  (
    '22222222-2222-2222-2222-222222222221',
    '11111111-1111-1111-1111-111111111111',
    'Ciclo universidad marzo',
    'Seguimiento de examenes y entregas del ciclo.',
    'active',
    'high',
    '2026-03-01T08:00:00-05:00',
    '2026-04-01T18:00:00-05:00',
    46
  )
on conflict (id) do nothing;

insert into tasks (
  id,
  profile_id,
  project_id,
  title,
  description,
  status,
  priority,
  due_at,
  scheduled_for,
  is_all_day,
  is_important,
  reminder_strategy,
  source_type
)
values
  (
    '33333333-3333-3333-3333-333333333331',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222221',
    'Repasar seguridad de redes',
    'Tema central para el parcial.',
    'active',
    'high',
    '2026-03-23T20:00:00-05:00',
    '2026-03-23T19:00:00-05:00',
    false,
    true,
    'auto',
    'manual'
  ),
  (
    '33333333-3333-3333-3333-333333333332',
    '11111111-1111-1111-1111-111111111111',
    null,
    'Actualizar CV para postular en LinkedIn',
    'Ajustar resumen y stack.',
    'active',
    'medium',
    '2026-03-23T21:30:00-05:00',
    '2026-03-23T21:00:00-05:00',
    false,
    false,
    'auto',
    'manual'
  )
on conflict (id) do nothing;

insert into events (
  id,
  profile_id,
  title,
  description,
  location,
  starts_at,
  ends_at,
  requires_travel,
  status,
  reminder_strategy,
  source_type
)
values
  (
    '44444444-4444-4444-4444-444444444441',
    '11111111-1111-1111-1111-111111111111',
    'Clase en universidad',
    'Redes y seguridad',
    'Aula B204',
    '2026-03-23T18:00:00-05:00',
    '2026-03-23T20:00:00-05:00',
    true,
    'scheduled',
    'auto',
    'manual'
  ),
  (
    '44444444-4444-4444-4444-444444444442',
    '11111111-1111-1111-1111-111111111111',
    'Bloque de estudio',
    'VPN, cifrado y control de acceso',
    'Casa',
    '2026-03-23T20:00:00-05:00',
    '2026-03-23T21:15:00-05:00',
    false,
    'scheduled',
    'auto',
    'assistant'
  )
on conflict (id) do nothing;

insert into exams (
  id,
  profile_id,
  project_id,
  course_name,
  title,
  description,
  exam_at,
  location,
  status,
  priority,
  study_plan_status,
  reminder_strategy,
  source_type
)
values
  (
    '55555555-5555-5555-5555-555555555551',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222221',
    'Redes',
    'Examen parcial de Redes',
    'Temas de seguridad y VPN.',
    '2026-03-27T14:00:00-05:00',
    'Campus central',
    'scheduled',
    'high',
    'missing',
    'auto',
    'manual'
  )
on conflict (id) do nothing;

insert into notification_rules (
  id,
  profile_id,
  entity_type,
  trigger_type,
  offset_minutes,
  is_enabled,
  max_retries
)
values
  (
    '66666666-6666-6666-6666-666666666661',
    '11111111-1111-1111-1111-111111111111',
    'task',
    'before_due',
    60,
    true,
    1
  ),
  (
    '66666666-6666-6666-6666-666666666662',
    '11111111-1111-1111-1111-111111111111',
    'exam',
    'before_due',
    10080,
    true,
    0
  )
on conflict (id) do nothing;

