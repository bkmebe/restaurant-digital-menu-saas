-- Phase 5: End of Day (EOD) Closing & Reconciliation

create table if not exists eod_closings (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  branch_id uuid references branches(id) on delete set null,
  business_date date not null default current_date,
  opened_at timestamptz default now(),
  closed_at timestamptz,
  status text default 'open' check (status in ('open','closing','closed','approved','reopened')),
  total_orders integer default 0,
  total_sales decimal(10,2) default 0,
  cash_sales decimal(10,2) default 0,
  card_sales decimal(10,2) default 0,
  mobile_money_sales decimal(10,2) default 0,
  expected_cash decimal(10,2) default 0,
  actual_cash decimal(10,2) default 0,
  discrepancy_amount decimal(10,2) default 0,
  notes text,
  closed_by uuid references profiles(id),
  approved_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(restaurant_id, business_date)
);

create table if not exists eod_closing_items (
  id uuid primary key default gen_random_uuid(),
  eod_closing_id uuid not null references eod_closings(id) on delete cascade,
  payment_method text not null,
  expected_amount decimal(10,2) default 0,
  actual_amount decimal(10,2) default 0,
  difference decimal(10,2) default 0,
  created_at timestamptz default now()
);

create table if not exists eod_approvals (
  id uuid primary key default gen_random_uuid(),
  eod_closing_id uuid not null references eod_closings(id) on delete cascade,
  approved_by uuid not null references profiles(id),
  status text not null check (status in ('approved','rejected')),
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_eod_closings_restaurant on eod_closings(restaurant_id, business_date);
create index if not exists idx_eod_closings_branch on eod_closings(branch_id, business_date);
create index if not exists idx_eod_closings_status on eod_closings(restaurant_id, status);
create index if not exists idx_eod_closing_items on eod_closing_items(eod_closing_id);
create index if not exists idx_eod_approvals on eod_approvals(eod_closing_id);

-- Enable RLS
alter table eod_closings enable row level security;
alter table eod_closing_items enable row level security;
alter table eod_approvals enable row level security;

-- RLS for eod_closings
create policy "Managers and admins can manage eod_closings"
  on eod_closings for all
  using (restaurant_id in (select restaurant_id from profiles where id = auth.uid() and role in ('admin','manager')))
  with check (restaurant_id in (select restaurant_id from profiles where id = auth.uid() and role in ('admin','manager')));

create policy "Owners can view eod_closings (read-only)"
  on eod_closings for select
  using (restaurant_id in (select restaurant_id from profiles where id = auth.uid() and role in ('owner','system_admin')));

-- RLS for eod_closing_items
create policy "Managers and admins can manage eod_closing_items"
  on eod_closing_items for all
  using (eod_closing_id in (select id from eod_closings where restaurant_id in (select restaurant_id from profiles where id = auth.uid() and role in ('admin','manager'))))
  with check (eod_closing_id in (select id from eod_closings where restaurant_id in (select restaurant_id from profiles where id = auth.uid() and role in ('admin','manager'))));

create policy "Owners can view eod_closing_items (read-only)"
  on eod_closing_items for select
  using (eod_closing_id in (select id from eod_closings where restaurant_id in (select restaurant_id from profiles where id = auth.uid() and role in ('owner','system_admin'))));

-- RLS for eod_approvals
create policy "Managers and admins can manage eod_approvals"
  on eod_approvals for all
  using (eod_closing_id in (select id from eod_closings where restaurant_id in (select restaurant_id from profiles where id = auth.uid() and role in ('admin','manager'))))
  with check (eod_closing_id in (select id from eod_closings where restaurant_id in (select restaurant_id from profiles where id = auth.uid() and role in ('admin','manager'))));

create policy "Owners can view eod_approvals (read-only)"
  on eod_approvals for select
  using (eod_closing_id in (select id from eod_closings where restaurant_id in (select restaurant_id from profiles where id = auth.uid() and role in ('owner','system_admin'))));

-- Auto-update updated_at
create or replace function update_eod_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_eod_closings_timestamp
  before update on eod_closings
  for each row execute function update_eod_timestamp();

-- Helper: get daily sales summary for EOD
create or replace function get_eod_sales_summary(p_restaurant_id uuid, p_date date)
returns table (
  total_orders bigint,
  total_sales decimal,
  cash_sales decimal,
  card_sales decimal,
  mobile_money_sales decimal
) as $$
  select
    count(*)::bigint as total_orders,
    coalesce(sum(total_amount), 0) as total_sales,
    coalesce(sum(case when o.payment_method = 'cash' then o.total_amount else 0 end), 0) as cash_sales,
    coalesce(sum(case when o.payment_method in ('bank', 'qr') then o.total_amount else 0 end), 0) as card_sales,
    coalesce(sum(case when o.payment_method in ('telebirr', 'cbe_birr') then o.total_amount else 0 end), 0) as mobile_money_sales
  from orders o
  where o.restaurant_id = p_restaurant_id
    and date(o.created_at) = p_date
    and o.status in ('paid', 'completed');
$$ language sql stable;
