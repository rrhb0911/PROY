-- El unique (gasto_fijo_id, periodo, quincena) no bloqueaba duplicados porque
-- quincena es NULL para los gastos fijos, y en Postgres NULL <> NULL en un
-- unique constraint. Se simplifica a (gasto_fijo_id, periodo) — un fijo no
-- debería tener más de una instancia por mes de todas formas.
alter table finanzas_pagos_fijos
  drop constraint if exists finanzas_pagos_fijos_gasto_fijo_id_periodo_quincena_key;

alter table finanzas_pagos_fijos
  add constraint finanzas_pagos_fijos_gasto_fijo_id_periodo_key unique (gasto_fijo_id, periodo);
