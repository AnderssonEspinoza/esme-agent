# Supabase

Este directorio guarda el modelo inicial de datos de XIO.

## Archivo principal

- `schema.sql`
- `seed.sql`

## Entidades centrales

- `profiles`: preferencias del usuario
- `projects`: proyectos personales o universitarios
- `tasks`: pendientes y acciones concretas
- `events`: clases, reuniones o citas
- `exams`: evaluaciones con seguimiento especial
- `reminders`: recordatorios concretos a enviar
- `notification_rules`: reglas automaticas por tipo de item
- `notification_deliveries`: historial por canal

## Idea clave

`tasks`, `events`, `exams` y `projects` representan la memoria de XIO.

`reminders` representa lo que XIO decidio avisar.

`notification_deliveries` representa por donde lo intento enviar.

## Regla importante

El usuario puede crear recordatorios manuales, pero el sistema debe soportar recordatorios automaticos y recordatorios de rescate desde el primer MVP.

## Uso recomendado

1. Crear el proyecto en Supabase.
2. Ejecutar `schema.sql`.
3. Ejecutar `seed.sql`.
4. Copiar las credenciales en `apps/web/.env.example`.
