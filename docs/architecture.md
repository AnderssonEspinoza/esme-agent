# Arquitectura propuesta

## Principio central

XIO debe tener un solo cerebro y multiples superficies.

Eso significa:

- una fuente central de datos
- una logica compartida
- interfaces diferentes para celular y computadora

## Arquitectura recomendada

### 1. Backend y datos

Usar `Supabase` para:

- autenticacion
- base de datos PostgreSQL
- realtime
- almacenamiento
- funciones programadas si luego hacen falta

Tablas iniciales sugeridas:

- `profiles`
- `tasks`
- `events`
- `projects`
- `exams`
- `notes`
- `reminders`
- `notification_rules`
- `notification_deliveries`
- `sources`

### 2. Cliente web

Usar `Next.js` como panel principal:

- dashboard diario
- calendario
- proyectos
- examenes
- captura rapida
- configuracion

Tambien puede funcionar como PWA para uso simple desde celular o laptop.

### 3. Cliente movil

Usar `Expo React Native` para:

- notificaciones push
- captura rapida
- consulta del dia
- recordatorios

La app movil no necesita todas las pantallas al inicio. Debe ser rapida y directa.

### 4. Motor de automatizacion

Crear un pequeno servicio `Node.js` para:

- reglas de recordatorios
- resumen diario
- parsing de texto natural
- futuras integraciones
- scraping autorizado

Este servicio no solo envia alertas. Tambien decide cuando crearlas automaticamente y cuando insistir si algo sigue pendiente.

## Flujo de datos

1. El usuario crea una tarea, evento o examen.
2. El backend guarda la informacion.
3. El motor de automatizacion calcula o genera recordatorios automaticamente.
4. Web y movil muestran el mismo estado.
5. XIO avisa en el momento correcto.

## Sistema de recordatorios automaticos

## Principio

El usuario no deberia depender siempre de acordarse de programar alertas.

Si un item tiene fecha o vencimiento, XIO debe proteger al usuario creando recordatorios por defecto.

## Reglas base por tipo

### Tareas

Si una tarea tiene fecha y hora:

- crear 1 recordatorio automatico entre 30 y 60 minutos antes

Si una tarea tiene fecha pero no hora:

- crear 1 recordatorio automatico a las 9:00 am del mismo dia

Si una tarea esta marcada como importante:

- crear 1 recordatorio adicional el dia anterior

### Examenes

Si se crea un examen con fecha:

- crear recordatorios automaticos 7 dias antes
- crear recordatorios automaticos 3 dias antes
- crear recordatorios automaticos 1 dia antes
- crear recordatorios automaticos 2 horas antes si existe hora exacta

### Proyectos

Si un proyecto tiene fecha limite:

- crear recordatorio automatico 7 dias antes
- crear recordatorio automatico 3 dias antes
- crear recordatorio automatico 1 dia antes

Si el proyecto dura varias semanas:

- crear chequeo semanal automatico de progreso

### Eventos

Si un evento tiene hora:

- crear 1 recordatorio automatico 1 hora antes

Si el evento requiere traslado:

- permitir una regla futura de recordatorio con anticipacion mayor

## Reglas de rescate

Estas reglas cubren el caso de "me olvide de poner recordatorio" o "ignore la alerta".

### Item con fecha pero sin recordatorio manual

- XIO genera recordatorios automaticos por defecto
- el usuario puede editarlos o apagarlos

### Item vencido y no completado

- moverlo a estado `overdue`
- enviar recordatorio de rescate
- mostrarlo arriba en la vista `que sigue`

### Item importante ignorado

Si una alerta fue enviada pero la tarea sigue abierta:

- reenviar una segunda alerta despues de un tiempo razonable
- evitar spam limitando el numero de reintentos

### Examen proximo sin plan de estudio

Si falta poco para un examen y no hay temas o sesiones de estudio:

- XIO lo marca como riesgo
- sugiere crear bloques de estudio

## Politica anti-spam

XIO debe ayudar, no molestar.

Reglas iniciales:

- no enviar mas de cierta cantidad de alertas por item en un mismo dia
- agrupar recordatorios cercanos cuando sea posible
- permitir modo silencioso por horario
- permitir recordatorios criticos aunque el resumen general este pausado

## Estados recomendados

Cada item importante debe tener estados claros:

- `draft`
- `scheduled`
- `active`
- `done`
- `overdue`
- `archived`

Cada recordatorio tambien debe guardar estado:

- `pending`
- `sent`
- `delivered`
- `failed`
- `dismissed`
- `snoozed`

## Snooze y reprogramacion

Para que XIO se sienta como asistente real, cada recordatorio debe permitir:

- `posponer 10 min`
- `posponer 1 hora`
- `recordar manana`
- `marcar como hecho`

Esto reduce friccion y evita que el usuario tenga que abrir formularios para todo.

## Modelo mental de producto

XIO tiene 4 capas:

### Capa 1: Registro

Donde entra la informacion:

- formularios
- captura rapida
- importaciones
- integraciones

### Capa 2: Memoria

Donde se organiza:

- tareas
- fechas
- notas
- contexto

### Capa 3: Inteligencia

Donde se interpreta:

- prioridad
- urgencia
- proximos pasos
- resumenes

### Capa 4: Presencia

Donde te acompana:

- web
- movil
- notificaciones
- despues escritorio

## Integraciones futuras

No deben entrar en la primera semana, pero si en el diseno:

- Google Calendar
- Gmail
- scraping del portal universitario
- LinkedIn job tracker
- Telegram o WhatsApp para recordatorios

## Regla de producto importante

Nunca dependamos de scraping o IA para lo esencial.

Si una integracion falla, XIO debe seguir funcionando con entrada manual.

Tampoco dependamos de que el usuario configure todo a mano. Las automatizaciones base deben existir desde el primer MVP.
