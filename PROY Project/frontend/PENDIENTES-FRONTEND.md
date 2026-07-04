# Pendientes — Frontend (PROY Dashboard)

Proyecto Next.js principal del dashboard PROY.

### Generales
- [ ] Revisar `PENDIENTES-PROY.md` para issues de seguridad cross-project (service role key, .env)
- [ ] Sincronizar tipos de Supabase (`npx supabase gen types`)
- [ ] Mantener build limpio (`npm run build`) y typescript (`npx tsc --noEmit`)
- [ ] npm audit periódico

### Específicos
- [ ] Componentes en server vs client — revisar que no se fugue lógica sensible al cliente
- [ ] Dashboard home — métricas en tiempo real desde Supabase
- [ ] Testing con Playwright (ya instalado)

### Sincronización de estado entre proyectos
- [x] Endpoint centralizado `POST /api/project-status` — recibe status/progreso/tareas de proyectos externos y hace upsert en `projects`/`project_tasks` usando la service role key (nunca expuesta a los proyectos externos)
- [x] Columna `slug` en `projects` (migración `supabase/migrations/0001_add_project_slug.sql`) para identificar cada proyecto externo de forma estable
- [x] `SUPABASE_SERVICE_ROLE_KEY` y `PROJECT_STATUS_API_TOKEN` reales en `.env.local` y en Vercel (Production + Preview)
- [x] Conectar VitalDent GAS, VitalDent Web y Zammy Portal — cada uno con su propio `report-status.mjs` + `.env` (token compartido, ignorado por git), corrido manualmente y verificado end-to-end contra producción
- [x] Reportar LabDent, Consultorio y Dental RX (Radiología) — sitios estáticos sin build pipeline, reportados con un POST manual único (sin script, no vale la pena automatizar algo que casi no cambia)
- [ ] Automatizar el disparo de la llamada en los proyectos con script (git hook, clasp push, GitHub Action) en vez de correrla a mano
- [ ] Sincronizar la copia duplicada de `zammy-portal` en `~/ZammyDeportes/` (mismo repo remoto — no necesita su propio `report-status.mjs`, ya reporta desde la copia de `PROY/aplicaciones-web/`)
