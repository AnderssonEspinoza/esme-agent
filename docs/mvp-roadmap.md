# Roadmap MVP

## Meta del MVP

Lograr que XIO sea util todos los dias, aunque aun no sea un asistente avanzado.

## Fase 1: Base funcional

Objetivo:

Tener un sistema que organice tareas, eventos y recordatorios.

Entregables:

- autenticacion simple
- dashboard de hoy
- CRUD de tareas
- CRUD de eventos
- CRUD de examenes
- recordatorios automaticos por defecto
- reintentos para pendientes vencidos o ignorados
- contador de dias restantes

## Fase 2: Contexto personal

Objetivo:

Que XIO recuerde proyectos, temas y pendientes abiertos.

Entregables:

- proyectos con fecha limite
- notas por proyecto
- checklist por proyecto
- vista "que sigue"
- resumen semanal

## Fase 3: Asistente util

Objetivo:

Agregar interaccion mas natural sin perder confiabilidad.

Entregables:

- captura rapida con lenguaje natural
- comandos tipo "recuerdame estudiar manana a las 8"
- resumen diario automatico
- sugerencias de prioridad

## Fase 4: Integraciones

Objetivo:

Conectar fuentes reales de informacion.

Entregables:

- importacion de calendario
- scraping del portal universitario si es viable y autorizado
- seguimiento de postulaciones
- notificaciones mas avanzadas

## Orden exacto recomendado de desarrollo

1. Diseñar modelo de datos.
2. Crear dashboard de hoy.
3. Crear modulo de tareas.
4. Crear modulo de eventos y examenes.
5. Activar recordatorios automaticos y reglas de rescate.
6. Crear captura rapida.
7. Agregar memoria de proyectos.
8. Integrar IA solo donde ya haya datos suficientes.

## Riesgos a evitar

- querer construir voz, scraping e IA desde el dia 1
- meter demasiadas pantallas
- no definir una fuente unica de verdad
- depender de procesos manuales complicados
- depender de que el usuario recuerde configurar alertas manualmente

## Definicion de exito del MVP

El MVP funciona si al final del dia puedes responder facil:

- que tenia que hacer hoy
- que quedo pendiente
- que vence pronto
- que debo estudiar esta semana
- cual es mi siguiente paso
