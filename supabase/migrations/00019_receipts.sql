-- Phase 6: Receipts & PDF Generation

create table if not exists receipt_templates (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  template_type text not null default 'thermal_80mm' check (template_type in ('thermal_80mm','pdf','email')),
  header_html text,
  footer_html text,
  styles text,
  is_default boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  receipt_type text not null default 'thermal_80mm' check (receipt_type in ('thermal_80mm','pdf','qr','email')),
  receipt_number text not null,
  receipt_data jsonb default '{}',
  receipt_text text,
  receipt_html text,
  status text default 'generated' check (status in ('generated','sent','failed','regenerated')),
  sent_to text,
  sent_at timestamptz,
  qr_code_data text,
  qr_code_url text,
  generated_by uuid references profiles(id),
  created_at timestamptz default now()
);

create index if not exists idx_receipts_restaurant on receipts(restaurant_id, created_at desc);
create index if not exists idx_receipts_order on receipts(order_id);
create index if not exists idx_receipts_number on receipts(receipt_number);

-- Enable RLS
alter table receipt_templates enable row level security;
alter table receipts enable row level security;

-- RLS: receipt_templates
create policy "Staff can view receipt_templates"
  on receipt_templates for select
  using (restaurant_id in (select restaurant_id from profiles where id = auth.uid()));

create policy "Admins can manage receipt_templates"
  on receipt_templates for all
  using (restaurant_id in (select restaurant_id from profiles where id = auth.uid() and role in ('admin','manager')))
  with check (restaurant_id in (select restaurant_id from profiles where id = auth.uid() and role in ('admin','manager')));

-- RLS: receipts
create policy "Staff can view receipts"
  on receipts for select
  using (restaurant_id in (select restaurant_id from profiles where id = auth.uid()));

create policy "Cashiers and up can insert receipts"
  on receipts for insert
  with check (restaurant_id in (select restaurant_id from profiles where id = auth.uid() and role in ('admin','manager','cashier')));

create policy "Admins can update receipts"
  on receipts for update
  using (restaurant_id in (select restaurant_id from profiles where id = auth.uid() and role in ('admin','manager')))
  with check (restaurant_id in (select restaurant_id from profiles where id = auth.uid() and role in ('admin','manager')));

-- Auto-update templates timestamp
create trigger update_receipt_templates_timestamp
  before update on receipt_templates
  for each row execute function update_updated_at();

-- Helper: generate next receipt number
create or replace function next_receipt_number(p_restaurant_id uuid)
returns text as $$
declare
  today_date text;
  seq_num int;
begin
  today_date := to_char(now(), 'YYYYMMDD');
  seq_num := coalesce(
    (select count(*) + 1 from receipts
     where restaurant_id = p_restaurant_id
       and date(created_at) = current_date),
    1
  );
  return 'RCP-' || today_date || '-' || lpad(seq_num::text, 4, '0');
end;
$$ language plpgsql stable;
