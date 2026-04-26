# Stack gratuito de XIO

XIO puede vivir con costo `0` en su primera etapa si usamos herramientas con plan gratuito.

## Componentes

### 1. Web principal

- `Next.js`
- hosting en `Vercel`

### 2. Base de datos

- `Supabase`
- autenticacion, Postgres y REST API

### 3. Vision artificial

- `Gemini API`
- entrada: imagen o screenshot
- salida: JSON estructurado

### 4. Notificaciones

- `Telegram Bot API`
- mensajes push al celular

### 5. Automatizaciones

- `Vercel Cron`
- o `GitHub Actions`

### 6. Captura automatica privada

- extension de `Chrome`
- scraping local desde tus sesiones ya abiertas

## Flujo recomendado

1. Abres el portal universitario o LinkedIn.
2. La extension detecta informacion util.
3. La extension envia los datos al endpoint privado de XIO.
4. XIO guarda y organiza.
5. El cron revisa vencimientos y manda recordatorios por Telegram.

## Variables de entorno

Archivo base:

- `apps/web/.env.example`

Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `XIO_INGEST_TOKEN`
- `GEMINI_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

## Regla de seguridad

La extension no debe tener llaves privadas de Supabase ni de Gemini.

La extension solo habla con endpoints privados de XIO usando un token de ingesta.
