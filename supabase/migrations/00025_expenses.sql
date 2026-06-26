-- Phase 10: Expenses Tracking
-- Tracks operational expenses for financial reporting and reconciliation

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  branch_id uuid references branches(id) on delete set null,
  category text not null check (category in (
    'supplies', 'utilities', 'rent', 'maintenance',
    'salary', 'marketing', 'food_cost', 'equipment',
    'insurance', 'tax', 'licenses', 'other'
  )),
  description text not null,
  amount decimal(10,2) not null check (amount > 0),
  tax_amount decimal(10,2) default 0,
  total_amount decimal(10,2) not null,
  expense_date date not null default current_date,
  payment_method text check (payment_method in ('cash', 'bank', 'mobile', 'credit')),
  receipt_url text,
  vendor_name text,
  vendor_contact text,
  notes text,
  is_recurring boolean default false,
  recurrence_interval text check (recurrence_interval in ('daily', 'weekly', 'monthly', 'yearly')),
  approved_by uuid references employees(id),
  approved_at timestamptz,
  recorded_by uuid not null references employees(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_expenses_restaurant_date on expenses(restaurant_id, expense_date);
create index if not exists idx_expenses_category on expenses(restaurant_id, category);
create index if not exists idx_expenses_branch on expenses(branch_id, expense_date);
create index if not exists idx_expenses_created on expenses(created_at desc);
create index if not exists idx_expenses_status on expenses(restaurant_id, expense_date desc);

-- Enable RLS
alter table expenses enable row level security;

-- RLS: Admins/managers/owners can view expenses within their restaurant
create policy expenses_select on expenses
  for select using (
    restaurant_id = get_current_tenant_id()
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin', 'manager', 'owner', 'system_admin')
    )
  );

-- RLS: Admins/managers can insert expenses
create policy expenses_insert on expenses
  for insert with check (
    restaurant_id = get_current_tenant_id()
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin', 'manager', 'system_admin')
    )
  );

-- RLS: Admins/managers can update expenses
create policy expenses_update on expenses
  for update using (
    restaurant_id = get_current_tenant_id()
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin', 'manager', 'system_admin')
    )
  );

-- RLS: Admins can delete expenses
create policy expenses_delete on expenses
  for delete using (
    restaurant_id = get_current_tenant_id()
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin', 'system_admin')
    )
  );

-- Trigger for updated_at
create trigger set_expenses_updated_at before update on expenses
  for each row execute function update_updated_at_column();
