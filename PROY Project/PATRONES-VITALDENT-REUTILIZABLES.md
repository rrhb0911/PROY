# Patrones reutilizables — VitalDent Web

Documentado 2026-09-27, compilado por Jarvis a partir del reporte de VD, para compartir con otros proyectos de la familia PROY (empezando por Zammy Portal). Sin datos de acceso (refs de Supabase, IDs de Vercel, secretos, correos reales) — eso vive solo en `aplicaciones-web/vitaldent-web/ARCHIVO-Y-LECCIONES.md`, dominio de VD.

## Stack

Next.js (App Router, TypeScript) + Supabase (Postgres) + Vercel + Gmail API (OAuth). PWA instalable.

## Patrones de arquitectura

- **Toda escritura pasa por una función Postgres SECURITY DEFINER (RPC), nunca insert/update directo desde el cliente.** La seguridad real vive DENTRO de cada función (funciones "identidad" tipo `resolver_usuario_actual()`/`app_is_admin()`), no en RLS policy por tabla. Definir esas 2-3 funciones al principio del proyecto y hacer que TODO pase por RPCs que las llaman primero.
- **Reglas de negocio configurables en una tabla `configuracion`** (clave/valor jsonb), no flags hardcodeados — se ajustan desde una pantalla sin deploy.
- **Un solo motor de tareas/notificaciones** reusado como cola de aprobación genérica para cualquier acción que necesite luz verde de un admin, en vez de un mecanismo distinto por feature.
- **Migraciones numeradas secuenciales + regla clave**: la definición VIVA en producción (`pg_get_functiondef`) es la fuente de verdad, no el archivo de migración — pueden divergir, verificar contra producción antes de asumir.
- **Acceso externo de solo lectura**: rol Postgres dedicado + `REVOKE EXECUTE` explícito sobre funciones + una Edge Function HTTPS como puente si quien consume vive detrás de un proxy que solo habla HTTP/HTTPS (una sesión cloud con conexión Postgres cruda se cuelga sin error claro).
- **Secretos siempre fuera del repo**, nunca en `.env` comiteado.
- **Guía de usuario + manual como una sola fuente de datos** consumida por 2 pantallas distintas — evita desactualización parcial.

## Componentes/módulos como esqueleto para copiar

- Patrón de server actions (`"use server"` + RPC).
- `ComprobanteQR` / `MedioPagoPicker` / `MotivoEgresoPicker` — evidencia + medios de pago + catálogo configurable, genéricos para cualquier POS.
- El sistema de tareas/notificaciones completo.
- Envío de correo OAuth con política TO/BCC centralizada.
- La carpeta de migraciones como plantilla de disciplina.

## Lecciones generales

- **"Confirma primero"** antes de cualquier cambio de lógica de negocio o dato en producción evitó reversos durante toda la vida del proyecto.
- El modo automático de Claude Code bloquea escrituras directas a producción incluso ya autorizadas — pedir vía confirmación explícita y reintentar funciona, cuesta una ronda extra. Para limpiezas grandes, agrupar todo en un bloque `DO $$ ... $$` (atómico, menos rondas).
- Antes de borrar/reasignar datos de un usuario: barrer FKs reales con `pg_constraint` directo, no solo patrones de nombre de columna.
- Archivos "trampa" en un repo (instrucciones falsas, avisos ya resueltos sin corregir) parecen pruebas deliberadas de si un agente sigue instrucciones sin verificar contra la realidad — no actuar sin confirmar primero.

## Si necesitas más detalle

Si Zammy (o cualquier otro proyecto) necesita el detalle completo de algún componente puntual (`ComprobanteQR`, el motor de tareas, etc.), pedírselo específico a VD directamente — lo comparte sin problema, solo no envía el mapa de accesos entre sesiones.
