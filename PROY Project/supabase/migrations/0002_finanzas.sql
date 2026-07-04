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

create policy "Full access to authenticated users" on finanzas_ingresos for all using (true) with check (true);
create policy "Full access to authenticated users" on finanzas_categorias_gasto for all using (true) with check (true);
create policy "Full access to authenticated users" on finanzas_gastos_variables for all using (true) with check (true);
create policy "Full access to authenticated users" on finanzas_gastos_fijos for all using (true) with check (true);
create policy "Full access to authenticated users" on finanzas_deudas for all using (true) with check (true);

insert into finanzas_categorias_gasto (nombre, color) values
  ('Servicios', '#3b82f6'),
  ('Alimentación', '#f59e0b'),
  ('Transporte', '#ef4444'),
  ('Familia', '#8b5cf6');
