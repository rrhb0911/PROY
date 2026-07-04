-- Añade slug estable para que proyectos externos se identifiquen
-- al reportar su estado vía /api/project-status
alter table projects add column if not exists slug text unique;
