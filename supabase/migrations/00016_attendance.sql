-- Phase 3: Attendance & Timesheets

create table if not exists staff_attendance (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  date date not null default current_date,
  clock_in timestamptz,
  clock_out timestamptz,
  total_break_minutes integer default 0,
  status text default 'present' check (status in ('present','absent','late','half_day','overtime')),
  late_minutes integer default 0,
  overtime_minutes integer default 0,
  notes text,
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(employee_id, date)
);

create table if not exists attendance_logs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  action text not null check (action in ('clock_in','clock_out','break_start','break_end')),
  timestamp timestamptz default now(),
  ip_address text,
  device_info text,
  created_at timestamptz default now()
);

create index if not exists idx_staff_attendance_date on staff_attendance(restaurant_id, date);
create index if not exists idx_staff_attendance_employee on staff_attendance(employee_id, date);
create index if not exists idx_attendance_logs_employee on attendance_logs(employee_id, timestamp);
create index if not exists idx_attendance_logs_restaurant on attendance_logs(restaurant_id, timestamp);

-- Enable RLS
alter table staff_attendance enable row level security;
alter table attendance_logs enable row level security;

-- RLS policies for staff_attendance
create policy "Staff can view own attendance"
  on staff_attendance for select
  using (employee_id in (select id from employees where profile_id = auth.uid()));

create policy "Staff can insert own attendance"
  on staff_attendance for insert
  with check (employee_id in (select id from employees where profile_id = auth.uid()));

create policy "Staff can update own clock_out and breaks"
  on staff_attendance for update
  using (employee_id in (select id from employees where profile_id = auth.uid()))
  with check (employee_id in (select id from employees where profile_id = auth.uid()));

create policy "Admin/manager can view all attendance"
  on staff_attendance for select
  using (restaurant_id in (select restaurant_id from profiles where id = auth.uid() and role in ('admin','manager','owner','system_admin')));

create policy "Admin/manager can update any attendance"
  on staff_attendance for update
  using (restaurant_id in (select restaurant_id from profiles where id = auth.uid() and role in ('admin','manager')));

-- RLS policies for attendance_logs
create policy "Staff can view own logs"
  on attendance_logs for select
  using (employee_id in (select id from employees where profile_id = auth.uid()));

create policy "Staff can insert own logs"
  on attendance_logs for insert
  with check (employee_id in (select id from employees where profile_id = auth.uid()));

create policy "Admin/manager can view all logs"
  on attendance_logs for select
  using (restaurant_id in (select restaurant_id from profiles where id = auth.uid() and role in ('admin','manager','owner','system_admin')));

-- Auto-update updated_at
create or replace function update_attendance_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_attendance_timestamp
  before update on staff_attendance
  for each row execute function update_attendance_timestamp();

-- Helper: get current attendance for an employee today
create or replace function get_todays_attendance(p_employee_id uuid)
returns staff_attendance as $$
  select * from staff_attendance
  where employee_id = p_employee_id
    and date = current_date
  limit 1;
$$ language sql stable;
