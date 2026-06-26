-- Phase 8: Tips Management
-- Tip pooling, distribution rules, payroll integration, payout reports

create table if not exists tip_pools (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  description text,
  pool_period_start date not null,
  pool_period_end date not null,
  total_collected numeric(12,2) not null default 0,
  total_distributed numeric(12,2) not null default 0,
  distribution_method text not null default 'equal_split'
    check (distribution_method in ('equal_split', 'hours_worked', 'role_weighted', 'sales_contribution')),
  status text not null default 'open'
    check (status in ('open', 'closed', 'distributed')),
  created_by uuid references employees(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists staff_tips (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  tip_pool_id uuid references tip_pools(id) on delete set null,
  tip_type text not null check (tip_type in ('cash', 'mobile', 'manual')),
  amount numeric(12,2) not null default 0,
  currency text not null default 'ETB',
  payment_reference text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'paid_out')),
  confirmed_by uuid references employees(id) on delete set null,
  confirmed_at timestamptz,
  paid_out_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists tip_distributions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  tip_pool_id uuid not null references tip_pools(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  weight numeric(5,2) not null default 1.00,
  amount numeric(12,2) not null default 0,
  is_paid boolean not null default false,
  paid_at timestamptz,
  paid_by uuid references employees(id) on delete set null,
  notes text,
  created_at timestamptz default now(),
  unique(tip_pool_id, employee_id)
);

-- RLS
alter table tip_pools enable row level security;
alter table staff_tips enable row level security;
alter table tip_distributions enable row level security;

-- All authenticated users can read tips/pools within their restaurant
create policy "Staff can view tips in their restaurant"
  on staff_tips for select
  using (restaurant_id in (
    select restaurant_id from profiles where id = auth.uid()
  ));

create policy "Staff can view tip pools in their restaurant"
  on tip_pools for select
  using (restaurant_id in (
    select restaurant_id from profiles where id = auth.uid()
  ));

create policy "Staff can view distributions in their restaurant"
  on tip_distributions for select
  using (restaurant_id in (
    select restaurant_id from profiles where id = auth.uid()
  ));

-- Waiter+ can insert their own tips
create policy "Waiters can insert own tips"
  on staff_tips for insert
  with check (
    restaurant_id in (
      select restaurant_id from profiles where id = auth.uid()
    )
    and employee_id in (
      select id from employees where profile_id = auth.uid()
    )
  );

-- Manager+ can manage tips
create policy "Managers can manage staff_tips"
  on staff_tips for insert
  with check (
    restaurant_id in (
      select restaurant_id from profiles
      where id = auth.uid() and role in ('admin','manager','owner','system_admin')
    )
  );

create policy "Managers can update staff_tips"
  on staff_tips for update
  using (
    restaurant_id in (
      select restaurant_id from profiles
      where id = auth.uid() and role in ('admin','manager','owner','system_admin')
    )
  );

create policy "Managers can delete staff_tips"
  on staff_tips for delete
  using (
    restaurant_id in (
      select restaurant_id from profiles
      where id = auth.uid() and role in ('admin','manager','owner','system_admin')
    )
  );

-- Manager+ can manage pools
create policy "Managers can manage tip_pools"
  on tip_pools for insert
  with check (
    restaurant_id in (
      select restaurant_id from profiles
      where id = auth.uid() and role in ('admin','manager','owner','system_admin')
    )
  );

create policy "Managers can update tip_pools"
  on tip_pools for update
  using (
    restaurant_id in (
      select restaurant_id from profiles
      where id = auth.uid() and role in ('admin','manager','owner','system_admin')
    )
  );

create policy "Managers can delete tip_pools"
  on tip_pools for delete
  using (
    restaurant_id in (
      select restaurant_id from profiles
      where id = auth.uid() and role in ('admin','manager','owner','system_admin')
    )
  );

-- Manager+ can manage distributions
create policy "Managers can manage distributions"
  on tip_distributions for insert
  with check (
    restaurant_id in (
      select restaurant_id from profiles
      where id = auth.uid() and role in ('admin','manager','owner','system_admin')
    )
  );

create policy "Managers can update distributions"
  on tip_distributions for update
  using (
    restaurant_id in (
      select restaurant_id from profiles
      where id = auth.uid() and role in ('admin','manager','owner','system_admin')
    )
  );

-- Indexes
create index if not exists idx_staff_tips_restaurant on staff_tips(restaurant_id);
create index if not exists idx_staff_tips_employee on staff_tips(employee_id);
create index if not exists idx_staff_tips_pool on staff_tips(tip_pool_id);
create index if not exists idx_staff_tips_status on staff_tips(status);
create index if not exists idx_staff_tips_date on staff_tips(created_at);
create index if not exists idx_tip_pools_restaurant on tip_pools(restaurant_id);
create index if not exists idx_tip_pools_dates on tip_pools(pool_period_start, pool_period_end);
create index if not exists idx_tip_distributions_pool on tip_distributions(tip_pool_id);
create index if not exists idx_tip_distributions_employee on tip_distributions(employee_id);
