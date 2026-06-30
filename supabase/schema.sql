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
