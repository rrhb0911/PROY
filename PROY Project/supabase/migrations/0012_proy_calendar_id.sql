-- Id del calendario dedicado "PROY" dentro de Google Calendar del usuario,
-- donde se empujan Eventos/Proyectos/Documentos del dashboard (no se mezclan con el calendario personal).
alter table google_calendar_tokens add column proy_calendar_id text;
