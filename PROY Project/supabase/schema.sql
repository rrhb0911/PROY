-- =====================================================
-- ESQUEMA: Termómetro de Proyectos
-- =====================================================

-- Categories for projects
create table project_categories (
  id bigint generated always as identity primary key,
  name text not null,
  color text not null default '#3b82f6',
  icon text,
  created_at timestamptz not null default now()
);

-- Main projects table
create table projects (
  id bigint generated always as identity primary key,
  name text not null,
  slug text unique,
  description text,
  category_id bigint references project_categories(id),
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'cancelled')),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  client_name text,
  budget decimal(12,2),
  start_date date,
  target_date date,
  url_repo text,
  url_deploy text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Status history log
create table project_status_log (
  id bigint generated always as identity primary key,
  project_id bigint not null references projects(id) on delete cascade,
  previous_status text,
  new_status text not null,
  changed_at timestamptz not null default now()
);

-- Tasks within projects
create table project_tasks (
  id bigint generated always as identity primary key,
  project_id bigint not null references projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'done', 'blocked')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  assigned_to text,
  due_date date,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

-- Auto-log status changes
create or replace function log_status_change()
returns trigger as $$
begin
  if old.status is distinct from new.status then
    insert into project_status_log (project_id, previous_status, new_status)
    values (new.id, old.status, new.status);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger projects_status_change
  after update of status on projects
  for each row execute function log_status_change();

-- Row Level Security
alter table projects enable row level security;
alter table project_categories enable row level security;
alter table project_status_log enable row level security;
alter table project_tasks enable row level security;

-- Default policies (authenticated users can do everything)
create policy "Full access to authenticated users" on projects
  for all using (true) with check (true);

create policy "Full access to authenticated users" on project_categories
  for all using (true) with check (true);

create policy "Full access to authenticated users" on project_status_log
  for all using (true) with check (true);

create policy "Full access to authenticated users" on project_tasks
  for all using (true) with check (true);

-- Seed categories
insert into project_categories (name, color, icon) values
  ('Desarrollo Web', '#3b82f6', 'globe'),
  ('Trading', '#10b981', 'trending-up'),
  ('Finanzas', '#f59e0b', 'wallet'),
  ('Ciclismo', '#ef4444', 'bike'),
  ('Cliente', '#8b5cf6', 'users');

-- =====================================================
-- ESQUEMA: Finanzas Personales
-- =====================================================

-- Ingresos (registro por periodo: quincena o mes)
create table finanzas_ingresos (
  id bigint generated always as identity primary key,
  fuente text not null,                          -- 'Salario Transcom', 'Otros'
  monto decimal(12,2) not null,
  periodo date not null,                         -- primer día del mes que representa
  quincena integer check (quincena in (1, 2)),   -- null si no aplica
  notas text,
  created_at timestamptz not null default now()
);

-- Categorías fijas de gasto variable
create table finanzas_categorias_gasto (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  color text not null default '#3b82f6'
);

-- Gastos variables (cambian cada mes)
create table finanzas_gastos_variables (
  id bigint generated always as identity primary key,
  categoria_id bigint not null references finanzas_categorias_gasto(id),
  concepto text not null,                        -- 'Luz', 'Pensión', 'Gasolina'...
  monto decimal(12,2) not null,
  periodo date not null,
  quincena integer check (quincena in (1, 2)),   -- null si el gasto es mensual, no por ciclo
  pagado boolean not null default false,
  notas text,
  created_at timestamptz not null default now()
);

-- Gastos fijos (recurrentes, con o sin plazo)
create table finanzas_gastos_fijos (
  id bigint generated always as identity primary key,
  nombre text not null,
  monto decimal(12,2) not null,
  tipo text not null check (tipo in ('cuota', 'indefinido')),
  cuotas_totales integer,                        -- solo si tipo = 'cuota'
  cuotas_pagadas integer not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Deudas (con personas)
create table finanzas_deudas (
  id bigint generated always as identity primary key,
  persona text not null,                         -- 'Hermana'
  concepto text not null,                        -- 'Cartera', 'TDC Master', 'Conciliación'...
  monto_original decimal(12,2),
  saldo_actual decimal(12,2) not null,
  pago_mensual decimal(12,2),
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Instancia mensual de un gasto fijo, para poder marcarlo pagado/pendiente
-- por periodo sin perder el catálogo base en finanzas_gastos_fijos.
create table finanzas_pagos_fijos (
  id bigint generated always as identity primary key,
  gasto_fijo_id bigint not null references finanzas_gastos_fijos(id) on delete cascade,
  periodo date not null,
  quincena integer check (quincena in (1, 2)),
  monto decimal(12,2) not null,
  pagado boolean not null default false,
  created_at timestamptz not null default now(),
  unique (gasto_fijo_id, periodo)
);

create trigger finanzas_gastos_fijos_updated_at
  before update on finanzas_gastos_fijos
  for each row execute function update_updated_at();

create trigger finanzas_deudas_updated_at
  before update on finanzas_deudas
  for each row execute function update_updated_at();

alter table finanzas_ingresos enable row level security;
alter table finanzas_categorias_gasto enable row level security;
alter table finanzas_gastos_variables enable row level security;
alter table finanzas_gastos_fijos enable row level security;
alter table finanzas_deudas enable row level security;
alter table finanzas_pagos_fijos enable row level security;

create policy "Full access to authenticated users" on finanzas_ingresos for all using (true) with check (true);
create policy "Full access to authenticated users" on finanzas_categorias_gasto for all using (true) with check (true);
create policy "Full access to authenticated users" on finanzas_gastos_variables for all using (true) with check (true);
create policy "Full access to authenticated users" on finanzas_gastos_fijos for all using (true) with check (true);
create policy "Full access to authenticated users" on finanzas_deudas for all using (true) with check (true);
create policy "Full access to authenticated users" on finanzas_pagos_fijos for all using (true) with check (true);

insert into finanzas_categorias_gasto (nombre, color) values
  ('Servicios', '#3b82f6'),
  ('Alimentación', '#f59e0b'),
  ('Transporte', '#ef4444'),
  ('Familia', '#8b5cf6');

-- =====================================================
-- ESQUEMA: Trading (Forex + Crypto) — registro manual
-- =====================================================

create table trading_cuentas (
  id bigint generated always as identity primary key,
  nombre text not null,
  mercado text not null check (mercado in ('forex', 'crypto')),
  broker text,
  balance_actual decimal(14,2) not null default 0,
  moneda text not null default 'USD',
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table trading_estrategias (
  id bigint generated always as identity primary key,
  nombre text not null,
  descripcion text,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

create table trading_bots (
  id bigint generated always as identity primary key,
  nombre text not null,
  estrategia_id bigint references trading_estrategias(id),
  cuenta_id bigint not null references trading_cuentas(id),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table trading_operaciones (
  id bigint generated always as identity primary key,
  cuenta_id bigint not null references trading_cuentas(id),
  mercado text not null check (mercado in ('forex', 'crypto')),
  estrategia_id bigint references trading_estrategias(id),
  bot_id bigint references trading_bots(id),
  par text not null,
  tipo text not null check (tipo in ('compra', 'venta')),
  resultado decimal(14,2) not null,
  fecha date not null,
  notas text,
  created_at timestamptz not null default now()
);

create table trading_analisis (
  id bigint generated always as identity primary key,
  mercado text check (mercado in ('forex', 'crypto')),
  titulo text not null,
  contenido text,
  fecha date not null default current_date,
  created_at timestamptz not null default now()
);

create index idx_trading_cuentas_mercado on trading_cuentas(mercado);
create index idx_trading_operaciones_mercado on trading_operaciones(mercado);
create index idx_trading_operaciones_fecha on trading_operaciones(fecha);
create index idx_trading_operaciones_cuenta on trading_operaciones(cuenta_id);
create index idx_trading_analisis_mercado on trading_analisis(mercado);

create trigger trading_cuentas_updated_at before update on trading_cuentas for each row execute function update_updated_at();
create trigger trading_bots_updated_at before update on trading_bots for each row execute function update_updated_at();

alter table trading_cuentas enable row level security;
alter table trading_estrategias enable row level security;
alter table trading_bots enable row level security;
alter table trading_operaciones enable row level security;
alter table trading_analisis enable row level security;

create policy "Full access to authenticated users" on trading_cuentas for all using (true) with check (true);
create policy "Full access to authenticated users" on trading_estrategias for all using (true) with check (true);
create policy "Full access to authenticated users" on trading_bots for all using (true) with check (true);
create policy "Full access to authenticated users" on trading_operaciones for all using (true) with check (true);
create policy "Full access to authenticated users" on trading_analisis for all using (true) with check (true);

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

-- =====================================================
-- ESQUEMA: Documentos personales
-- =====================================================

create table documentos (
  id bigint generated always as identity primary key,
  categoria text not null check (categoria in (
    'identificacion', 'vehicular', 'financiero', 'contractual', 'garantia', 'salud', 'vivienda'
  )),
  nombre text not null,
  numero_referencia text,
  emisor text,
  fecha_emision date,
  fecha_vencimiento date,
  dias_alerta integer not null default 30,
  ubicacion_fisica text,
  link_digital text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_documentos_vencimiento on documentos(fecha_vencimiento);
create index idx_documentos_categoria on documentos(categoria);

create trigger documentos_updated_at before update on documentos for each row execute function update_updated_at();

alter table documentos enable row level security;
create policy "Full access to authenticated users" on documentos for all using (true) with check (true);

-- =====================================================
-- ESQUEMA: Calendario — eventos personales
-- =====================================================
-- La vista "Próximos" del dashboard une esta tabla con projects.target_date
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
