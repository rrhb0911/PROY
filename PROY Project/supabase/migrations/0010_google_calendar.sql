-- =====================================================
-- ESQUEMA: Integración Google Calendar
-- =====================================================

create table google_calendar_tokens (
  id bigint generated always as identity primary key,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table google_calendar_sync (
  id bigint generated always as identity primary key,
  origen text not null check (origen in ('evento', 'proyecto', 'documento')),
  origen_id bigint not null,
  google_event_id text not null,
  synced_at timestamptz not null default now(),
  unique (origen, origen_id)
);

alter table google_calendar_tokens enable row level security;
alter table google_calendar_sync enable row level security;

create policy "Full access to authenticated users" on google_calendar_tokens for all using (true) with check (true);
create policy "Full access to authenticated users" on google_calendar_sync for all using (true) with check (true);
