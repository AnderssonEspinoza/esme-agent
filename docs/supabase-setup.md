# Configurar Supabase en XIO

## 1. Crear proyecto

1. Entra a Supabase.
2. Crea un proyecto nuevo.
3. Espera a que termine la inicializacion.

## 2. Ejecutar esquema

Abre el editor SQL de Supabase y ejecuta:

- `supabase/schema.sql`

Luego ejecuta:

- `supabase/seed.sql`

## 3. Copiar credenciales

En `Project Settings` → `API Keys` o `Connect`, copia:

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`

Guarda todo en:

- `apps/web/.env.local`

## 4. Reiniciar la app

```bash
cd /home/andersson/Escritorio/xio
npm run dev
```

## 5. Verificar salud

Abre:

```txt
http://localhost:3004/api/supabase/health
```

Si todo va bien, veras:

- `ok: true`

## 6. Que ya deberia funcionar

- leer tareas, eventos, examenes y proyectos desde Supabase
- crear tareas desde la web
- ingesta desde la extension privada
- cron de recordatorios listo para usar

## 7. Si algo falla

Casos comunes:

- faltan variables en `.env.local`
- no ejecutaste `schema.sql`
- no ejecutaste `seed.sql`
- copiaste mal `service_role`
