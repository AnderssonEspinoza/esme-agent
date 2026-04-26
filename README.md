# XIO

XIO es un asistente personal inteligente pensado para vivir en el celular y en la computadora, con enfoque en organizacion, seguimiento de pendientes, agenda, recordatorios y contexto personal.

La idea no es hacer "otro chatbot", sino construir una especie de copiloto personal:

- que recuerde tu horario, examenes, proyectos y tareas pendientes
- que entienda en que estas trabajando
- que te avise lo importante en el momento correcto
- que te ayude a bajar carga mental
- que luego pueda conectarse a fuentes reales como tu portal universitario, calendario, correo o notas

## Objetivo inicial

Construir un MVP funcional que permita:

- guardar tareas, eventos, examenes y proyectos
- ver cuanto tiempo falta para cada cosa
- recibir recordatorios en celular y computadora
- registrar conversaciones o pendientes rapidos
- generar una vista clara de "que sigue despues"

## Enfoque recomendado

Para llegar a algo tipo "Jarvis" sin perdernos, XIO debe construirse en fases:

1. Un nucleo confiable de agenda, pendientes y recordatorios.
2. Una memoria personal simple con contexto de universidad, trabajo y metas.
3. Automatizaciones e integraciones.
4. Un asistente conversacional mas proactivo.

## Documentacion base

- [Vision del producto](./docs/product-vision.md)
- [Arquitectura propuesta](./docs/architecture.md)
- [Roadmap MVP](./docs/mvp-roadmap.md)
- [Stack gratuito](./docs/free-stack.md)
- [Configurar Supabase](./docs/supabase-setup.md)
- [Prisma con Supabase](./docs/prisma-setup.md)

## Decision tecnica recomendada

Primera etapa:

- `frontend web`: Next.js
- `app movil`: Expo / React Native
- `backend`: Supabase
- `ia y automatizaciones`: servidor Node.js pequeno

Esto nos da:

- avance rapido
- autenticacion
- base de datos y realtime
- notificaciones y sincronizacion
- una ruta clara para luego conectar scraping, correo, calendario y memoria con IA

## Primer MVP realista

El primer XIO no necesita hablar como Pepper todavia. Necesita ser util de verdad.

Si el MVP logra estas 5 cosas, ya vale:

- capturar pendientes rapido
- mostrar tu semana
- avisarte lo urgente
- decirte que sigue
- recordar contexto de universidad y proyectos

## Siguiente paso

El siguiente paso recomendado es construir el repositorio base con:

- `apps/web`
- `apps/mobile`
- `packages/shared`
- `docs`

y empezar por el flujo mas importante:

`crear pendiente -> programar recordatorio -> recibir alerta -> marcar como hecho`

En XIO ese flujo luego evoluciona a algo mejor:

`crear pendiente -> XIO genera alertas por defecto -> recibe alerta -> pospone o completa`
