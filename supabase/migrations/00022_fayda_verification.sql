-- Fayda ID Verification System
-- Tracks employee Fayda (Ethiopian National ID) verification attempts and status

-- Create verification_status enum
do $$ begin
  create type fayda_verification_status as enum (
    'pending', 'verified', 'failed', 'expired'
  );
exception
  when duplicate_object then null;
end $$;

-- Create fayda_verifications table
create table if not exists fayda_verifications (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  fayda_number text not null,
  full_name text,
  phone text,
  date_of_birth date,
  verification_status fayda_verification_status not null default 'pending',
  transaction_id text,
  verification_response jsonb,
  verified_by uuid references employees(id),
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for fast lookups
create index if not exists idx_fayda_verifications_restaurant on fayda_verifications(restaurant_id);
create index if not exists idx_fayda_verifications_employee on fayda_verifications(employee_id);
create index if not exists idx_fayda_verifications_status on fayda_verifications(verification_status);
create index if not exists idx_fayda_verifications_number on fayda_verifications(fayda_number);

-- Enable RLS
alter table fayda_verifications enable row level security;

-- RLS: All authenticated users can view verifications within their restaurant
create policy fayda_verifications_select on fayda_verifications
  for select
  using (restaurant_id = get_current_tenant_id());

-- RLS: Admin+ can insert verifications
create policy fayda_verifications_insert on fayda_verifications
  for insert
  with check (
    restaurant_id = get_current_tenant_id()
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin', 'manager', 'system_admin')
    )
  );

-- RLS: Admin+ can update verifications
create policy fayda_verifications_update on fayda_verifications
  for update
  using (
    restaurant_id = get_current_tenant_id()
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin', 'manager', 'system_admin')
    )
  );

-- RLS: Admin only can delete verifications
create policy fayda_verifications_delete on fayda_verifications
  for delete
  using (
    restaurant_id = get_current_tenant_id()
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin', 'system_admin')
    )
  );

-- Trigger for updated_at
create trigger set_fayda_verifications_updated_at before update on fayda_verifications
  for each row execute function update_updated_at_column();
