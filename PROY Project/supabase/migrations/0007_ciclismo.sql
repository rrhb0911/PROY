-- =====================================================
-- ESQUEMA: Ciclismo — registro manual
-- =====================================================

create table ciclismo_mesociclos (
  id bigint generated always as identity primary key,
  nombre text not null,
  fecha_inicio date not null,
  fecha_fin date,
  enfoque text,
  metrica_objetivo text,
  created_at timestamptz not null default now()
);

create table ciclismo_semanas (
  id bigint generated always as identity primary key,
  semana_inicio date not null unique,
  mesociclo_id bigint references ciclismo_mesociclos(id),
  ctl decimal(6,2),
  atl decimal(6,2),
  tsb decimal(6,2),
  tte_min integer,
  ftp integer,
  eftp integer,
  frc integer,
  peso decimal(5,2),
  kj integer,
  horas decimal(5,2),
  notas text,
  created_at timestamptz not null default now()
);

create table ciclismo_entrenos (
  id bigint generated always as identity primary key,
  fecha date not null,
  tipo text,
  duracion_min integer,
  tss integer,
  intensity_factor decimal(4,2),
  potencia_promedio integer,
  hr_promedio integer,
  kj integer,
  rpe integer check (rpe between 1 and 10),
  notas text,
  created_at timestamptz not null default now()
);

create index idx_ciclismo_semanas_mesociclo on ciclismo_semanas(mesociclo_id);
create index idx_ciclismo_entrenos_fecha on ciclismo_entrenos(fecha);

alter table ciclismo_mesociclos enable row level security;
alter table ciclismo_semanas enable row level security;
alter table ciclismo_entrenos enable row level security;

create policy "Full access to authenticated users" on ciclismo_mesociclos for all using (true) with check (true);
create policy "Full access to authenticated users" on ciclismo_semanas for all using (true) with check (true);
create policy "Full access to authenticated users" on ciclismo_entrenos for all using (true) with check (true);
