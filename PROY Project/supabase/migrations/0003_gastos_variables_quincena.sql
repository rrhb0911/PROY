-- Algunos gastos variables se pagan por quincena (ciclo de pago 15/30), no solo por mes.
alter table finanzas_gastos_variables
  add column if not exists quincena integer check (quincena in (1, 2));
