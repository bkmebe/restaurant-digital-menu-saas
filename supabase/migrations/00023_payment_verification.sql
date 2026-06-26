-- Mobile Payment Verification System
-- Tracks manual verification of mobile money payments (Telebirr, CBE Birr, SantimPay, Chapa)
-- with TallyETBot integration support

-- Create verification method enum
do $$ begin
  create type payment_verification_method as enum (
    'receipt_upload', 'reference_check', 'api_verification'
  );
exception
  when duplicate_object then null;
end $$;

-- Create verification status enum
do $$ begin
  create type payment_verification_status as enum (
    'pending', 'verified', 'rejected', 'disputed'
  );
exception
  when duplicate_object then null;
end $$;

-- Extend payment_configs provider enum with new providers
do $$ begin
  alter type payment_provider add value if not exists 'santimpay';
exception
  when duplicate_object then null;
end $$;
do $$ begin
  alter type payment_provider add value if not exists 'chapa';
exception
  when duplicate_object then null;
end $$;

-- Create payment_verifications table
create table if not exists payment_verifications (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  payment_config_id uuid references payment_configs(id) on delete set null,
  provider text not null,
  verification_method payment_verification_method not null default 'receipt_upload',
  verification_reference text,
  receipt_image_url text,
  amount numeric(12,2),
  currency text not null default 'ETB',
  status payment_verification_status not null default 'pending',
  verified_by uuid references employees(id),
  verified_at timestamptz,
  verified_notes text,
  external_verification_id text,
  external_verification_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_payment_verifications_restaurant on payment_verifications(restaurant_id);
create index if not exists idx_payment_verifications_order on payment_verifications(order_id);
create index if not exists idx_payment_verifications_status on payment_verifications(status);
create index if not exists idx_payment_verifications_provider on payment_verifications(provider);
create index if not exists idx_payment_verifications_external on payment_verifications(external_verification_id);

-- Enable RLS
alter table payment_verifications enable row level security;

-- RLS: All authenticated users can view verifications within their restaurant
create policy payment_verifications_select on payment_verifications
  for select using (restaurant_id = get_current_tenant_id());

-- RLS: Staff can insert verifications
create policy payment_verifications_insert on payment_verifications
  for insert with check (
    restaurant_id = get_current_tenant_id()
  );

-- RLS: Cashier+ can update verifications
create policy payment_verifications_update on payment_verifications
  for update using (
    restaurant_id = get_current_tenant_id()
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin', 'manager', 'cashier', 'system_admin')
    )
  );

-- RLS: Admin only can delete
create policy payment_verifications_delete on payment_verifications
  for delete using (
    restaurant_id = get_current_tenant_id()
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin', 'system_admin')
    )
  );

-- Trigger for updated_at
create trigger set_payment_verifications_updated_at before update on payment_verifications
  for each row execute function update_updated_at_column();
