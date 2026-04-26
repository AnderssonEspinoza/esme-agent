# Prisma con Supabase

Si quieres crear tablas desde este proyecto hacia Supabase, Prisma es la forma correcta.

## Lo que falta para usar Prisma

Ademas de tus llaves REST, Prisma necesita una conexion directa a Postgres:

- `DATABASE_URL`

## Donde se obtiene

En Supabase:

1. `Project Settings`
2. `Database`
3. `Connection string`
4. copia la version `URI`

Ejemplo:

```txt
postgresql://postgres:TU_PASSWORD@db.xxxxx.supabase.co:5432/postgres
```

## Donde va

Archivo:

- `apps/web/.env.local`

Ejemplo:

```env
DATABASE_URL=postgresql://postgres:TU_PASSWORD@db.xxxxx.supabase.co:5432/postgres
```

## Comandos

Generar cliente Prisma:

```bash
npm run prisma:generate -w @xio/web
```

Empujar tablas a Supabase:

```bash
npm run prisma:push -w @xio/web
```

Migraciones locales:

```bash
npm run prisma:migrate -w @xio/web
```
