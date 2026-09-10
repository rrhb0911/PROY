# Tower — spec de migración de Claude Artifact a Next.js/Vercel (proyecto nuevo)

## Contexto

"Tower" (antes "Torre de Control") es un dashboard personal de Rafael
Herrera hoy publicado como un único archivo HTML dentro de un Claude
Artifact: `https://claude.ai/code/artifact/42e47274-2d84-45f4-9f08-5264cc75e595`.
Cubre 5 vistas: Resumen, Estudios (UNAD), Ciclo/Deporte, Finanzas y
Calendario, con navegación por rail, transiciones tipo slide entre vistas,
temas claro/oscuro por vista, y un lenguaje visual "Plano" (grid de fondo
tipo blueprint, titleblocks) unificado en todas.

⚠️ **Nota (2026-09-06):** este monorepo tiene un proyecto Next.js viejo en
`PROY Project/frontend/` (desplegado en Vercel, Supabase, con rutas
`calendario/`, `finanzas/`, `estudios/`, etc. y una integración real con
Google Calendar en `api/calendar-sync/route.ts` + `src/lib/google-calendar.ts`).

**Decisión de Rafa: ese proyecto viejo no sirvió — NO se reutiliza ni se
fusiona.** Tower se construye como **proyecto nuevo, independiente**. No
tocar ni depender de `frontend/` ni de `supabase/schema.sql` — se dejan
intactos donde están (no se borran, simplemente se ignoran) por si alguna
vez hace falta rescatar algo puntual, pero no son la base de este trabajo.

La única pieza de ese proyecto viejo que SÍ vale la pena mirar rápido antes
de reinventar OAuth desde cero es el patrón de `src/lib/google-calendar.ts`
(cómo maneja el refresh token) — solo como referencia de "esto ya se hizo
una vez y funcionaba", no como código a heredar.

El archivo fuente completo del Artifact actual (`torre-control-app.html`,
HTML+CSS+JS inline, ~380KB) fue enviado a Rafa por chat el 2026-09-06 — pídeselo
si no está ya en este repo, es la fuente de verdad del diseño visual y la
lógica de Tower que hay que portar.

## Qué reemplaza qué

El Artifact usa dos APIs que solo existen en el runtime de Claude Artifacts
(`window.claude.use(...)`), no en un navegador normal:

| Artifact API | Reemplazo en el proyecto nuevo |
|---|---|
| `db` (persistencia Finance/prefs) | Tablas propias en el Supabase nuevo del proyecto Tower |
| `mcp` Google Calendar | OAuth2 real con `googleapis` (`google.calendar('v3')`) en un route handler propio |

## Paso 0 — Cuenta Vercel y equipo

Todo (proyecto + base de datos) se crea bajo la cuenta/equipo **`rrhb`** de
Vercel — no en un scope/team distinto ni en una cuenta personal genérica.

1. `vercel login` (si no hay sesión activa) y `vercel teams ls` para
   confirmar que el team `rrhb` existe y es accesible antes de seguir. Si
   no aparece con ese nombre exacto, PARAR y preguntarle a Rafa cuál es el
   slug correcto — no asumir ni crear un team nuevo.
2. `vercel link --scope rrhb` (o seleccionar el team `rrhb` en el prompt
   interactivo) al crear el proyecto, para que quede asociado ahí desde el
   primer deploy.
3. **Base de datos**: usar el marketplace de integraciones de Vercel
   (Vercel Dashboard → proyecto → pestaña "Storage" → "Create Database" →
   Supabase, o `vercel integration add supabase` si el equipo lo soporta
   por CLI) para que Supabase se aprovisione directamente conectado a este
   proyecto de Vercel, con las env vars (`SUPABASE_URL`,
   `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, etc.) sincronizadas
   automáticamente — no crear el proyecto Supabase por fuera y pegarlo a
   mano salvo que la integración no esté disponible para el team `rrhb`,
   en cuyo caso hacerlo manual desde supabase.com y sincronizar las env
   vars igual.

## Paso 1 — Setup del proyecto nuevo

1. `npx create-next-app@latest tower --typescript --tailwind=false --app`
   (sin Tailwind: el CSS actual del Artifact ya es un sistema de tokens
   propio, migrarlo a Tailwind sería reescribir sin necesidad) — repo
   nuevo en GitHub, proyecto nuevo en Vercel bajo el team `rrhb` (Paso 0),
   deploy on push a `main`.
2. Variables de entorno (las de Supabase ya llegan solas si se usó la
   integración del Paso 0; agregar además):
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.
3. Base de datos Supabase nueva (Paso 0), separada de `supabase/` del
   monorepo viejo — no compartir esquema con el proyecto descartado.
4. Para el OAuth de Google Calendar: registrar credenciales nuevas en
   Google Cloud Console (API de Calendar habilitada, pantalla de
   consentimiento en modo "Testing" con Rafa como usuario de prueba
   alcanza). Se puede mirar `frontend/src/lib/google-calendar.ts` del
   proyecto viejo solo como referencia de "esto ya se hizo una vez y
   funcionaba" (manejo de refresh token), sin heredar su código.

## Paso 2 — Reemplazar `db` por tablas Supabase propias

Tablas sugeridas (una por colección actual del Artifact):

```sql
create table finanzas_config (
  id text primary key,           -- 'categories'
  data jsonb not null,
  updated_at timestamptz default now()
);

create table finanzas_mensual (
  mes text primary key,          -- 'YYYY-MM'
  data jsonb not null,
  updated_at timestamptz default now()
);

create table ui_prefs (
  key text primary key,          -- 'accent_color', 'bg_color', 'quincena_colors'
  data jsonb not null,
  updated_at timestamptz default now()
);
```

- Cliente `@supabase/supabase-js` en el navegador con `anon key` + Row
  Level Security restringido a Rafa (Supabase Auth, magic link o
  email/password — no hace falta multiusuario).
- Reemplazar cada `db.doc(x).get()/set()/onSnapshot()` del Artifact por:
  lectura `supabase.from(tabla).select().eq('id', x).single()`, escritura
  `supabase.from(tabla).upsert({id: x, data, updated_at: now})`, live sync
  `supabase.channel(...).on('postgres_changes', ...)`.
- Semilla inicial: usar `tower-data-snapshot-2026-09-06.json` (mismo
  directorio que este archivo) — es un export real, hecho con `read_db`
  directo contra el Artifact el 2026-09-06, de las 3 colecciones que sí
  tienen datos reales guardados (`finanzas_config/categories`,
  `finanzas_mensual/2026-09`, `ui_prefs/*`). **No usar el `FALLBACK`
  hardcodeado en `torre-control-app.html`** — ese es solo data de ejemplo
  vieja, este snapshot es lo que Rafa realmente tiene cargado hoy. Si al
  ejecutar la migración ya pasó más de un mes desde esa fecha, volver a
  exportar con `Artifact action:"read_db"` contra la URL del Artifact
  antes de sembrar, para no perder ediciones más recientes.

## Paso 3 — Portar la UI de Tower

- El sistema de tokens `--v-*`/`--p-*` por `.view-X` (CSS puro, sin
  dependencias de Artifact) se porta tal cual a CSS Modules o globals.css
  por ruta.
- Rail de navegación, transiciones slide entre vistas, reloj digital: JS
  puro, se portan a componentes React (`useState`/`useEffect`) sin cambios
  de lógica.
- El modelo de Finance (quincenas, categorías, colores por quincena) y las
  4 vistas de Calendario (día/semana/mes/año) con el bloque sintético de
  horario laboral + ajuste DST + festivos de Colombia: lógica de negocio
  pura, se porta sin cambios.

## Paso 4 — Reemplazar `mcp` (Google Calendar) por OAuth real

1. En Google Cloud Console: proyecto nuevo, habilitar **Google Calendar
   API**, pantalla de consentimiento OAuth en modo "Testing" con Rafa
   como usuario de prueba.
2. Credenciales OAuth 2.0 "Web application", redirect URI apuntando a
   `https://<dominio-vercel>/api/auth/google/callback`.
3. Flujo: botón "Conectar Google Calendar" → redirect a Google → callback
   guarda `refresh_token` en Supabase → route handler server-side usa
   `googleapis` (`google.calendar('v3')`) con ese refresh token para
   `events.list/insert/update/delete` — mismo shape de datos que ya
   observaron las llamadas `mcp` del Artifact (colorId, start/end,
   location, etc.), así que el mapeo a los componentes existentes
   (`calEventsForDate`, `calPillHtml`, etc.) no cambia.

## Paso 5 — Checklist de verificación

- [ ] Login/Auth de Supabase protege todas las rutas.
- [ ] Finanzas: crear/editar/archivar/eliminar gasto persiste en Supabase
      y sobrevive un refresh (realtime channel actualiza sin recargar).
- [ ] Calendario: eventos reales de tu Google Calendar aparecen en las 4
      vistas; crear/editar/borrar desde Tower se refleja en Google
      Calendar de verdad.
- [ ] Tema claro/oscuro y colores de acento/fondo por vista se mantienen
      igual que en el Artifact.
- [ ] Swipe/carrusel en móvil sigue funcionando igual.
- [ ] Deploy en Vercel con el proyecto nuevo, HTTPS por defecto.

## Fuera de alcance de este documento

- Integración con Strava (plan futuro para el PMC/CTL-ATL-TSB de Ciclo,
  ver `PROY Project/CICLISMO.md` y memoria `project_torre_control_rediseno`
  de la sesión de UNAD) — se aborda aparte cuando se pida explícitamente.
- Gráficas tipo ECharts para Ciclo/Resumen (Fase 3 del rediseño original)
  — no depende de esta migración.

## Regla de trato

Háblale a Rafa siempre de "tú" (tuteo estándar colombiano), nunca de "vos".

## Documento relacionado

La vista "Estudios" de Tower refleja el avance real de las materias de
Rafa en UNAD (nodos por unidad/entrega, estado, notas). El modelo/lenguaje
con el que se trabaja ese avance (y el trato con Rafa en general) está en
`study/UNAD/archivos/prompt-tutor-agente.md` — no hace falta seguir ese
prompt para construir Tower, pero sirve de contexto si hay que decidir qué
campos debe tener el modelo de datos de esa vista.
