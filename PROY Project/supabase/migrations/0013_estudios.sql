-- =====================================================
-- ESQUEMA: Estudios — Recursos + Metas
-- =====================================================

create table estudios_recursos (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('libro', 'curso', 'articulo', 'herramienta')),
  area text not null check (area in ('programacion', 'trading', 'ciclismo', 'finanzas', 'data_science', 'ingles')),
  titulo text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'en_progreso', 'completado')),
  link text,
  notas text,
  created_at timestamptz not null default now()
);

create table estudios_metas (
  id bigint generated always as identity primary key,
  trimestre text not null,
  meta text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'en_progreso', 'completado')),
  notas text,
  created_at timestamptz not null default now()
);

create index idx_estudios_recursos_area on estudios_recursos(area);

alter table estudios_recursos enable row level security;
alter table estudios_metas enable row level security;
create policy "Full access to authenticated users" on estudios_recursos for all using (true) with check (true);
create policy "Full access to authenticated users" on estudios_metas for all using (true) with check (true);
