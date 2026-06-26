-- Phase 4: Shift Management

create table if not exists staff_shifts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  employee_id uuid references employees(id) on delete set null,
  title text not null,
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  break_minutes integer default 0,
  status text default 'scheduled' check (status in ('scheduled','active','completed','cancelled','missed')),
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists shift_assignments (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references staff_shifts(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  assigned_at timestamptz default now(),
  accepted_at timestamptz,
  status text default 'pending' check (status in ('pending','accepted','declined')),
  unique(shift_id, employee_id)
);

create index if not exists idx_staff_shifts_date on staff_shifts(restaurant_id, shift_date);
create index if not exists idx_staff_shifts_employee on staff_shifts(employee_id, shift_date);
create index if not exists idx_staff_shifts_status on staff_shifts(restaurant_id, status);
create index if not exists idx_shift_assignments_shift on shift_assignments(shift_id);
create index if not exists idx_shift_assignments_employee on shift_assignments(employee_id, status);

-- Enable RLS
alter table staff_shifts enable row level security;
alter table shift_assignments enable row level security;

-- RLS policies for staff_shifts
create policy "Employees can view their own shifts"
  on staff_shifts for select
  using (employee_id in (select id from employees where profile_id = auth.uid()));

create policy "Admin/manager can manage shifts"
  on staff_shifts for all
  using (restaurant_id in (select restaurant_id from profiles where id = auth.uid() and role in ('admin','manager')))
  with check (restaurant_id in (select restaurant_id from profiles where id = auth.uid() and role in ('admin','manager')));

create policy "Owner can view shifts (read-only)"
  on staff_shifts for select
  using (restaurant_id in (select restaurant_id from profiles where id = auth.uid() and role in ('owner','system_admin')));

-- RLS policies for shift_assignments
create policy "Employees can view their own assignments"
  on shift_assignments for select
  using (employee_id in (select id from employees where profile_id = auth.uid()));

create policy "Employees can update their own assignment status"
  on shift_assignments for update
  using (employee_id in (select id from employees where profile_id = auth.uid()))
  with check (employee_id in (select id from employees where profile_id = auth.uid()));

create policy "Admin/manager can manage assignments"
  on shift_assignments for all
  using (shift_id in (select id from staff_shifts where restaurant_id in (select restaurant_id from profiles where id = auth.uid() and role in ('admin','manager'))))
  with check (shift_id in (select id from staff_shifts where restaurant_id in (select restaurant_id from profiles where id = auth.uid() and role in ('admin','manager'))));

create policy "Owner can view assignments (read-only)"
  on shift_assignments for select
  using (shift_id in (select id from staff_shifts where restaurant_id in (select restaurant_id from profiles where id = auth.uid() and role in ('owner','system_admin'))));

-- Auto-update updated_at
create trigger set_shift_timestamp
  before update on staff_shifts
  for each row execute function update_attendance_timestamp();

-- Helper: get shifts for a date range
create or replace function get_shifts_for_range(
  p_restaurant_id uuid,
  p_start_date date,
  p_end_date date
) returns setof staff_shifts as $$
  select * from staff_shifts
  where restaurant_id = p_restaurant_id
    and shift_date >= p_start_date
    and shift_date <= p_end_date
  order by shift_date, start_time;
$$ language sql stable;

-- Helper: check coverage for a date
create or replace function check_coverage(p_restaurant_id uuid, p_date date)
returns table (
  total_shifts bigint,
  assigned_shifts bigint,
  unassigned_shifts bigint
) as $$
  select
    count(*) as total_shifts,
    count(*) filter (where employee_id is not null) as assigned_shifts,
    count(*) filter (where employee_id is null) as unassigned_shifts
  from staff_shifts
  where restaurant_id = p_restaurant_id
    and shift_date = p_date
    and status = 'scheduled';
$$ language sql stable;
