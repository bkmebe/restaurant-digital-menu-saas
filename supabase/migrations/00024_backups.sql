-- Backup Records
-- Tracks database backup operations for disaster recovery and compliance
-- Supports daily automated, manual, and on-demand backups

-- Create backup type enum
do $$ begin
  create type backup_type as enum ('daily', 'manual', 'on_demand');
exception
  when duplicate_object then null;
end $$;

-- Create backup status enum
do $$ begin
  create type backup_status as enum ('in_progress', 'completed', 'failed');
exception
  when duplicate_object then null;
end $$;

-- Create backup_records table
create table if not exists backup_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  restaurant_id uuid references restaurants(id) on delete cascade,

  backup_type backup_type not null default 'manual',
  status backup_status not null default 'in_progress',
  size_bytes bigint,
  file_url text,
  checksum text,

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz,

  notes text,
  created_by uuid references employees(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_backup_records_organization on backup_records(organization_id);
create index if not exists idx_backup_records_restaurant on backup_records(restaurant_id);
create index if not exists idx_backup_records_status on backup_records(status);
create index if not exists idx_backup_records_type on backup_records(backup_type);
create index if not exists idx_backup_records_started on backup_records(started_at desc);

-- Enable RLS
alter table backup_records enable row level security;

-- RLS: Admins/system_admins can view backups within their restaurant
create policy backup_records_select on backup_records
  for select using (
    restaurant_id = get_current_tenant_id()
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin', 'system_admin')
    )
  );

-- RLS: Admins/system_admins can insert backups
create policy backup_records_insert on backup_records
  for insert with check (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin', 'system_admin')
    )
  );

-- RLS: Admins/system_admins can update backups
create policy backup_records_update on backup_records
  for update using (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin', 'system_admin')
    )
  );

-- RLS: Admins/system_admins can delete backups (with tenant scope)
create policy backup_records_delete on backup_records
  for delete using (
    restaurant_id = get_current_tenant_id()
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin', 'system_admin')
    )
  );

-- Trigger for updated_at
create trigger set_backup_records_updated_at before update on backup_records
  for each row execute function update_updated_at_column();
