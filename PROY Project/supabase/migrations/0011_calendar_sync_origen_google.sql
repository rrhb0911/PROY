-- Distingue mapeos creados por el dashboard (se pueden actualizar en Google al editarlos)
-- de los importados directo de Google (cumpleaños, fuera de oficina, etc. - nunca se sobreescriben).
alter table google_calendar_sync
  add column created_by text not null default 'dashboard' check (created_by in ('dashboard', 'google'));
