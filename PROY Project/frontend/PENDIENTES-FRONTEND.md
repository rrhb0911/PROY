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
