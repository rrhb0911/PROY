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
