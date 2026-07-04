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
- [ ] Añadir `SUPABASE_SERVICE_ROLE_KEY` y `PROJECT_STATUS_API_TOKEN` reales en `.env.local` y en Vercel (Production + Preview)
- [ ] Conectar cada proyecto externo (VitalDent Web, Zammy Portal, VitalDent GAS, LabDent, Consultorio) para que llame al endpoint tras trabajar en ellos
- [ ] Automatizar el disparo de esa llamada (git hook, clasp push, GitHub Action) en vez de correrla a mano
