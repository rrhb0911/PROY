-- =====================================================
-- ESQUEMA: Calendario — eventos personales
-- =====================================================
-- Nota: la vista "Próximos" del dashboard une esta tabla con projects.target_date
-- y documentos.fecha_vencimiento (ya existentes) — no se duplican esos datos aquí.

create table calendario_eventos (
  id bigint generated always as identity primary key,
  titulo text not null,
  fecha date not null,
  hora time,
  categoria text not null default 'personal' check (categoria in ('personal', 'recordatorio')),
  notas text,
  created_at timestamptz not null default now()
);

create index idx_calendario_eventos_fecha on calendario_eventos(fecha);

alter table calendario_eventos enable row level security;
create policy "Full access to authenticated users" on calendario_eventos for all using (true) with check (true);
