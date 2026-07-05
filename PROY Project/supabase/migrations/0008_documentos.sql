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
