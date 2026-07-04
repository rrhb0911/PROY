-- Checklist de pagos: pagado/pendiente para gastos variables, y una instancia
-- mensual por gasto fijo (los fijos son un catálogo sin fecha; cada mes
-- necesita su propia fila para poder marcarse pagado independientemente).

alter table finanzas_gastos_variables add column if not exists pagado boolean not null default false;

create table finanzas_pagos_fijos (
  id bigint generated always as identity primary key,
  gasto_fijo_id bigint not null references finanzas_gastos_fijos(id) on delete cascade,
  periodo date not null,
  quincena integer check (quincena in (1, 2)),
  monto decimal(12,2) not null,       -- copiado del fijo al crear la fila; editable si el monto real difiere
  pagado boolean not null default false,
  created_at timestamptz not null default now(),
  unique (gasto_fijo_id, periodo, quincena)
);

alter table finanzas_pagos_fijos enable row level security;
create policy "Full access to authenticated users" on finanzas_pagos_fijos for all using (true) with check (true);
