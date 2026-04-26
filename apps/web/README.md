# apps/web

Aplicacion web principal de XIO.

Responsabilidades iniciales:

- dashboard de hoy
- tareas
- eventos
- examenes
- proyectos
- captura rapida

## Modo funcional local (sin Supabase)

Si Supabase no esta disponible, XIO usa almacenamiento local persistente en:

- `apps/web/.xio-data/store.json`

Esto permite trabajar con datos reales (tareas, eventos, recordatorios, notas) sin maqueta.
