-- ============================================================
-- Restaurant Digital Menu — Consolidated Schema (Phases 1-9)
-- Combines all CREATE TABLE / CREATE TYPE / CREATE VIEW
-- statements from migrations 00001 through 00021 + role_expansion + reservations
-- ============================================================

-- +-----------------------+
-- | Custom Enums          |
-- +-----------------------+

-- 00001_initial_schema.sql + 00013_staff_roles_login.sql + 20260623000001_role_expansion.sql
CREATE TYPE user_role AS ENUM (
  'admin', 'manager', 'cashier', 'waiter',
  'kitchen_staff', 'inventory_manager',
  'system_admin', 'owner'
);

CREATE TYPE table_status AS ENUM ('available', 'occupied', 'cleaning');
CREATE TYPE order_status AS ENUM ('open', 'preparing', 'served', 'paid', 'pending', 'accepted', 'ready', 'delivered', 'completed', 'cancelled');
CREATE TYPE service_request_type AS ENUM ('waiter', 'bill', 'other');
CREATE TYPE service_request_status AS ENUM ('pending', 'acknowledged', 'resolved');
CREATE TYPE payroll_status AS ENUM ('pending', 'paid', 'cancelled');
CREATE TYPE payment_provider AS ENUM ('telebirr', 'cbe_birr', 'bank', 'qr', 'santimpay', 'chapa');
CREATE TYPE payment_verification_method AS ENUM ('receipt_upload', 'reference_check', 'api_verification');
CREATE TYPE payment_verification_status AS ENUM ('pending', 'verified', 'rejected', 'disputed');

-- 00003_kds.sql
CREATE TYPE kitchen_role AS ENUM ('chef', 'kitchen_manager');

-- +-----------------------+
-- | 00001 — Initial       |
-- +-----------------------+

CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  currency TEXT DEFAULT 'ETB',
  tax_rate DECIMAL DEFAULT 0,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  organization_id UUID,
  branch_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  organization_id UUID,
  role user_role NOT NULL DEFAULT 'waiter',
  phone TEXT UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  is_mfa_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  name_am TEXT NOT NULL,
  name_om TEXT NOT NULL,
  icon TEXT DEFAULT '📋',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  name_am TEXT NOT NULL,
  name_om TEXT NOT NULL,
  description TEXT DEFAULT '',
  description_am TEXT DEFAULT '',
  description_om TEXT DEFAULT '',
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  table_number INTEGER NOT NULL,
  capacity INTEGER DEFAULT 4,
  status table_status DEFAULT 'available',
  qr_code_url TEXT,
  qr_code_data TEXT,
  assigned_waiter_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(restaurant_id, table_number)
);

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  role user_role NOT NULL,
  national_id TEXT,
  national_id_verified BOOLEAN DEFAULT false,
  digital_employee_id TEXT UNIQUE NOT NULL,
  salary DECIMAL(10,2) DEFAULT 0,
  hire_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  fayda_number TEXT,
  fayda_verified BOOLEAN DEFAULT false,
  fayda_verified_at TIMESTAMPTZ,
  fayda_transaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  table_id UUID REFERENCES tables(id) ON DELETE CASCADE NOT NULL,
  customer_name TEXT,
  status order_status DEFAULT 'open',
  total_amount DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  special_instructions TEXT,
  estimated_prep_time INTEGER,
  accepted_at TIMESTAMPTZ,
  preparing_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  notes TEXT,
  special_requests TEXT,
  prep_status TEXT DEFAULT 'new',
  station_id UUID,
  prep_started_at TIMESTAMPTZ,
  prep_completed_at TIMESTAMPTZ,
  assigned_chef_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  table_id UUID REFERENCES tables(id) ON DELETE CASCADE NOT NULL,
  type service_request_type NOT NULL,
  status service_request_status DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payment_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  provider payment_provider NOT NULL,
  label TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  qr_image_url TEXT,
  payment_link TEXT,
  bank_name TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payrolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  salary DECIMAL(10,2) NOT NULL,
  bonuses DECIMAL(10,2) DEFAULT 0,
  deductions DECIMAL(10,2) DEFAULT 0,
  net_pay DECIMAL(10,2) NOT NULL,
  status payroll_status DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, month, year)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  actor_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  device_info TEXT,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- +-----------------------+
-- | 00003 — KDS           |
-- +-----------------------+

CREATE TABLE IF NOT EXISTS kitchen_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  name_am TEXT,
  name_om TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kitchen_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  role kitchen_role NOT NULL DEFAULT 'chef',
  station_id UUID REFERENCES kitchen_stations(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kitchen_performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  chef_id UUID REFERENCES kitchen_staff(id),
  station_id UUID REFERENCES kitchen_stations(id),
  action TEXT NOT NULL,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- +-----------------------+
-- | 00004 — Inventory     |
-- +-----------------------+

CREATE TABLE IF NOT EXISTS units_of_measure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  category TEXT DEFAULT 'weight'
);

CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  name_am TEXT,
  name_om TEXT,
  unit_id UUID REFERENCES units_of_measure(id),
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE NOT NULL,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL,
  quantity DECIMAL(10,3) NOT NULL,
  unit_id UUID REFERENCES units_of_measure(id),
  is_optional BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(menu_item_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_quantity DECIMAL(10,3) DEFAULT 0,
  unit_id UUID REFERENCES units_of_measure(id),
  reorder_level DECIMAL(10,3) DEFAULT 0,
  reorder_quantity DECIMAL(10,3) DEFAULT 0,
  unit_cost DECIMAL(10,2) DEFAULT 0,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL,
  quantity DECIMAL(10,3) NOT NULL,
  type TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  unit_cost DECIMAL(10,2),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  payment_terms TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL,
  unit_cost DECIMAL(10,2),
  lead_time_days INTEGER,
  is_preferred BOOLEAN DEFAULT false,
  UNIQUE(supplier_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  order_number TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ordered', 'received', 'cancelled')),
  order_date DATE DEFAULT CURRENT_DATE,
  expected_date DATE,
  received_date DATE,
  total_amount DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL,
  quantity_ordered DECIMAL(10,3) NOT NULL,
  quantity_received DECIMAL(10,3) DEFAULT 0,
  unit_cost DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wastage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL,
  quantity DECIMAL(10,3) NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS low_stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL,
  current_quantity DECIMAL(10,3),
  reorder_level DECIMAL(10,3),
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- +-----------------------+
-- | 00005 — Multi-Tenant  |
-- +-----------------------+

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  onboarding_step INTEGER DEFAULT 0,
  setup_completed BOOLEAN DEFAULT false,
  subscription_plan_id UUID,
  subscription_status TEXT DEFAULT 'trial',
  max_branches INTEGER DEFAULT 1,
  max_employees INTEGER DEFAULT 10,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  name_am TEXT,
  name_om TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  currency TEXT DEFAULT 'ETB',
  tax_rate DECIMAL DEFAULT 0,
  timezone TEXT DEFAULT 'Africa/Addis_Ababa',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2),
  max_branches INTEGER DEFAULT 1,
  max_employees INTEGER DEFAULT 10,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES subscription_plans(id) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id),
  invoice_number TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  payment_method TEXT,
  paid_at TIMESTAMPTZ,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  branch_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, profile_id)
);

-- +-----------------------+
-- | 00006 — Payments      |
-- +-----------------------+

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('telebirr', 'chapa', 'santimpay', 'cbe_birr', 'cash')),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'ETB',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded')),
  provider_reference TEXT,
  checkout_url TEXT,
  payment_link TEXT,
  phone TEXT,
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  refund_amount DECIMAL(10,2),
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_type TEXT,
  raw_body JSONB,
  headers JSONB,
  signature TEXT,
  is_verified BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- +-----------------------+
-- | 00007 — Security      |
-- +-----------------------+

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  device_fingerprint TEXT,
  is_active BOOLEAN DEFAULT true,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_limit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS encrypted_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(restaurant_id, name)
);

-- +-----------------------+
-- | 00008 — Analytics MV  |
-- +-----------------------+

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_sales AS
SELECT
  restaurant_id,
  DATE(created_at) as date,
  COUNT(*) as order_count,
  COUNT(DISTINCT table_id) as tables_served,
  SUM(total_amount) as revenue,
  AVG(total_amount) as avg_order_value,
  SUM(total_amount) / NULLIF(COUNT(*), 0) as revenue_per_order
FROM orders
WHERE status IN ('paid', 'completed')
GROUP BY restaurant_id, DATE(created_at)
ORDER BY date DESC;

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_menu_performance AS
SELECT
  mi.restaurant_id,
  mi.id as menu_item_id,
  mi.name,
  mi.price,
  c.name as category_name,
  COUNT(DISTINCT o.id) as order_count,
  SUM(oi.quantity) as total_quantity,
  SUM(oi.subtotal) as total_revenue
FROM menu_items mi
LEFT JOIN order_items oi ON oi.menu_item_id = mi.id
LEFT JOIN orders o ON o.id = oi.order_id AND o.status IN ('paid', 'completed')
LEFT JOIN categories c ON c.id = mi.category_id
GROUP BY mi.restaurant_id, mi.id, mi.name, mi.price, c.name;

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_staff_performance AS
SELECT
  o.restaurant_id,
  o.created_by as profile_id,
  p.full_name,
  p.role,
  COUNT(DISTINCT o.id) as orders_handled,
  COUNT(DISTINCT o.table_id) as tables_served,
  SUM(o.total_amount) as revenue_generated,
  AVG(o.total_amount) as avg_order_value
FROM orders o
JOIN profiles p ON p.id = o.created_by
WHERE o.status IN ('paid', 'completed')
GROUP BY o.restaurant_id, o.created_by, p.full_name, p.role;

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_table_utilization AS
SELECT
  t.restaurant_id,
  t.id as table_id,
  t.table_number,
  t.capacity,
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(DISTINCT DATE(o.created_at)) as active_days,
  AVG(EXTRACT(EPOCH FROM (o.updated_at - o.created_at))/60)::INTEGER as avg_dining_minutes
FROM tables t
LEFT JOIN orders o ON o.table_id = t.id AND o.status IN ('paid', 'completed')
GROUP BY t.restaurant_id, t.id, t.table_number, t.capacity;

-- +-----------------------+
-- | 00016 — Attendance    |
-- +-----------------------+

CREATE TABLE IF NOT EXISTS staff_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  total_break_minutes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'present' CHECK (status IN ('present','absent','late','half_day','overtime')),
  late_minutes INTEGER DEFAULT 0,
  overtime_minutes INTEGER DEFAULT 0,
  notes TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, date)
);

CREATE TABLE IF NOT EXISTS attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('clock_in','clock_out','break_start','break_end')),
  timestamp TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  device_info TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- +-----------------------+
-- | 00017 — Shift Mgmt    |
-- +-----------------------+

CREATE TABLE IF NOT EXISTS staff_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','active','completed','cancelled','missed')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES staff_shifts(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  UNIQUE(shift_id, employee_id)
);

-- +-----------------------+
-- | Foreign Key Fixups    |
-- +-----------------------+

-- Tables that reference employees (created before employees existed)
ALTER TABLE tables ADD CONSTRAINT IF NOT EXISTS fk_tables_waiter FOREIGN KEY (assigned_waiter_id) REFERENCES employees(id);

-- order_items FK to kitchen_stations and kitchen_staff (added by 00003 KDS)
ALTER TABLE order_items ADD CONSTRAINT IF NOT EXISTS fk_order_items_station FOREIGN KEY (station_id) REFERENCES kitchen_stations(id);
ALTER TABLE order_items ADD CONSTRAINT IF NOT EXISTS fk_order_items_chef FOREIGN KEY (assigned_chef_id) REFERENCES kitchen_staff(id);

-- restaurants FK to organizations (added by 00005 multi-tenant)
ALTER TABLE restaurants ADD CONSTRAINT IF NOT EXISTS fk_restaurants_organization FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE restaurants ADD CONSTRAINT IF NOT EXISTS fk_restaurants_branch FOREIGN KEY (branch_id) REFERENCES branches(id);

-- profiles FK to organizations (used by onboarding function)
ALTER TABLE profiles ADD CONSTRAINT IF NOT EXISTS fk_profiles_organization FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- organizations FK to subscription_plans (added by role_expansion)
ALTER TABLE organizations ADD CONSTRAINT IF NOT EXISTS fk_organizations_plan FOREIGN KEY (subscription_plan_id) REFERENCES subscription_plans(id);

-- +-----------------------+
-- | Unique Indexes for MV |
-- +-----------------------+

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_sales ON mv_daily_sales(restaurant_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_menu_performance ON mv_menu_performance(restaurant_id, menu_item_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_staff_performance ON mv_staff_performance(restaurant_id, profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_table_utilization ON mv_table_utilization(restaurant_id, table_id);

-- +-----------------------+
-- | Updated-at Triggers   |
-- +-----------------------+

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attendance & shift timestamp update function
CREATE OR REPLACE FUNCTION update_attendance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_restaurants_updated_at
  BEFORE UPDATE ON restaurants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_staff_attendance_updated_at
  BEFORE UPDATE ON staff_attendance FOR EACH ROW EXECUTE FUNCTION update_attendance_timestamp();
CREATE TRIGGER update_staff_shifts_updated_at
  BEFORE UPDATE ON staff_shifts FOR EACH ROW EXECUTE FUNCTION update_attendance_timestamp();

-- Payroll net-pay calculation
CREATE OR REPLACE FUNCTION calculate_net_pay()
RETURNS TRIGGER AS $$
BEGIN
  NEW.net_pay = NEW.salary + NEW.bonuses - NEW.deductions;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_payroll_net_pay
  BEFORE INSERT OR UPDATE ON payrolls FOR EACH ROW EXECUTE FUNCTION calculate_net_pay();

-- ============================================================
-- Phase 8: Tips Management
-- ============================================================

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

-- +--------------------------------------------------------------------+
-- | 20260623000002_reservations.sql — Phase 9: Reservations & Waitlist   |
-- +--------------------------------------------------------------------+

create type fayda_verification_status as enum (
  'pending', 'verified', 'failed', 'expired'
);

create type reservation_status as enum (
  'pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'
);

create type waitlist_status as enum (
  'waiting', 'notified', 'seated', 'cancelled'
);

create type notification_channel as enum (
  'sms', 'email'
);

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  guest_count integer not null check (guest_count > 0),
  reservation_date date not null,
  reservation_time time not null,
  duration_minutes integer not null default 90 check (duration_minutes > 0),
  status reservation_status not null default 'pending',
  special_requests text,
  notes text,
  created_by uuid references employees(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists reservation_tables (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  table_id uuid not null references tables(id) on delete cascade,
  unique (reservation_id, table_id)
);

create table if not exists waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  guest_count integer not null check (guest_count > 0),
  status waitlist_status not null default 'waiting',
  notified_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists reservation_notifications (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  type text not null check (type in ('confirmation', 'reminder', 'cancellation', 'status_update')),
  channel notification_channel not null,
  recipient text not null,
  sent_at timestamptz not null default now(),
  status text not null default 'sent' check (status in ('sent', 'failed')),
  error_message text
);

create index if not exists idx_reservations_restaurant_date on reservations(restaurant_id, reservation_date);
create index if not exists idx_reservations_status on reservations(restaurant_id, status);
create index if not exists idx_reservations_customer_phone on reservations(restaurant_id, customer_phone);
create index if not exists idx_reservation_tables_table on reservation_tables(table_id);
create index if not exists idx_reservation_tables_reservation on reservation_tables(reservation_id);
create index if not exists idx_waitlist_restaurant_status on waitlist_entries(restaurant_id, status);

alter table reservations enable row level security;
alter table reservation_tables enable row level security;
alter table waitlist_entries enable row level security;
alter table reservation_notifications enable row level security;

create policy reservations_tenant_isolation on reservations for all using (restaurant_id = get_current_tenant_id());
create policy reservations_select_all on reservations for select using (true);
create policy reservation_tables_tenant_isolation on reservation_tables for all using (
  exists (select 1 from reservations r where r.id = reservation_id and r.restaurant_id = get_current_tenant_id())
);
create policy reservation_tables_select_all on reservation_tables for select using (true);
create policy waitlist_tenant_isolation on waitlist_entries for all using (restaurant_id = get_current_tenant_id());
create policy waitlist_select_all on waitlist_entries for select using (true);
create policy reservation_notifications_tenant_isolation on reservation_notifications for all using (
  exists (select 1 from reservations r where r.id = reservation_id and r.restaurant_id = get_current_tenant_id())
);
create policy reservation_notifications_select_all on reservation_notifications for select using (true);

create trigger set_reservations_updated_at before update on reservations
  for each row execute function update_updated_at_column();

-- ── Phase 10: CRM & Loyalty ─────────────────────────────────────
create type loyalty_tier as enum ('bronze', 'silver', 'gold', 'platinum');
create type coupon_type as enum ('percentage', 'fixed_amount', 'free_item', 'bogof');
create type campaign_status as enum ('draft', 'scheduled', 'active', 'completed', 'cancelled');
create type campaign_type as enum ('promotion', 'event', 'newsletter', 'loyalty_drive', 'reengagement');
create type points_source as enum ('purchase', 'bonus', 'redemption', 'expiry', 'adjustment');
create type points_reference_type as enum ('order', 'coupon', 'manual');

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  total_visits integer not null default 0,
  total_spent decimal(12,2) not null default 0,
  loyalty_tier loyalty_tier not null default 'bronze',
  notes text,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, phone),
  unique (restaurant_id, email)
);

create table if not exists reward_points (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  points integer not null check (points != 0),
  source points_source not null,
  reference_type points_reference_type not null default 'manual',
  reference_id uuid,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  code text not null,
  type coupon_type not null,
  value decimal(12,2) not null check (value > 0),
  min_order_amount decimal(12,2) not null default 0,
  max_discount decimal(12,2),
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  usage_per_customer integer not null default 1 check (usage_per_customer > 0),
  current_uses integer not null default 0 check (current_uses >= 0),
  is_active boolean not null default true,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  description text,
  applicable_customer_tags text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, code)
);

create table if not exists coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references coupons(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  order_id uuid,
  discount_amount decimal(12,2) not null default 0,
  redeemed_at timestamptz not null default now()
);

create table if not exists visit_history (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  order_id uuid,
  visit_date date not null default current_date,
  amount_spent decimal(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  type campaign_type not null default 'promotion',
  status campaign_status not null default 'draft',
  target_customer_tags text[] default '{}',
  channel text not null default 'sms' check (channel in ('sms', 'email', 'both')),
  content text not null,
  scheduled_at timestamptz,
  sent_at timestamptz,
  sent_count integer not null default 0,
  opened_count integer not null default 0,
  redeemed_count integer not null default 0,
  created_by uuid references employees(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customers_restaurant on customers(restaurant_id);
create index if not exists idx_customers_tier on customers(restaurant_id, loyalty_tier);
create index if not exists idx_customers_tags on customers using gin(tags);
create index if not exists idx_reward_points_customer on reward_points(customer_id);
create index if not exists idx_reward_points_restaurant on reward_points(restaurant_id, created_at desc);
create index if not exists idx_coupons_restaurant on coupons(restaurant_id, is_active);
create index if not exists idx_coupons_code on coupons(restaurant_id, code) where is_active = true;
create index if not exists idx_coupons_expires on coupons(restaurant_id, expires_at) where is_active = true;
create index if not exists idx_coupon_redemptions_coupon on coupon_redemptions(coupon_id);
create index if not exists idx_coupon_redemptions_customer on coupon_redemptions(customer_id);
create index if not exists idx_visit_history_customer on visit_history(customer_id);
create index if not exists idx_visit_history_restaurant_date on visit_history(restaurant_id, visit_date desc);
create index if not exists idx_campaigns_restaurant_status on marketing_campaigns(restaurant_id, status);
create index if not exists idx_campaigns_scheduled on marketing_campaigns(restaurant_id, scheduled_at)
  where status = 'scheduled';

alter table customers enable row level security;
alter table reward_points enable row level security;
alter table coupons enable row level security;
alter table coupon_redemptions enable row level security;
alter table visit_history enable row level security;
alter table marketing_campaigns enable row level security;

create policy customers_tenant_isolation on customers for all using (restaurant_id = get_current_tenant_id());
create policy customers_select_all on customers for select using (true);
create policy reward_points_tenant_isolation on reward_points for all using (
  exists (select 1 from customers c where c.id = customer_id and c.restaurant_id = get_current_tenant_id())
);
create policy reward_points_select_all on reward_points for select using (true);
create policy coupons_tenant_isolation on coupons for all using (restaurant_id = get_current_tenant_id());
create policy coupons_select_all on coupons for select using (true);
create policy coupon_redemptions_tenant_isolation on coupon_redemptions for all using (
  exists (select 1 from coupons co where co.id = coupon_id and co.restaurant_id = get_current_tenant_id())
);
create policy coupon_redemptions_select_all on coupon_redemptions for select using (true);
create policy visit_history_tenant_isolation on visit_history for all using (
  exists (select 1 from customers c where c.id = customer_id and c.restaurant_id = get_current_tenant_id())
);
create policy visit_history_select_all on visit_history for select using (true);
create policy campaigns_tenant_isolation on marketing_campaigns for all using (restaurant_id = get_current_tenant_id());
create policy campaigns_select_all on marketing_campaigns for select using (true);

-- Mobile Payment Verification

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

create index if not exists idx_payment_verifications_restaurant on payment_verifications(restaurant_id);
create index if not exists idx_payment_verifications_order on payment_verifications(order_id);
create index if not exists idx_payment_verifications_status on payment_verifications(status);
create index if not exists idx_payment_verifications_provider on payment_verifications(provider);
create index if not exists idx_payment_verifications_external on payment_verifications(external_verification_id);

alter table payment_verifications enable row level security;

create policy payment_verifications_select on payment_verifications
  for select using (restaurant_id = get_current_tenant_id());

create policy payment_verifications_insert on payment_verifications
  for insert with check (restaurant_id = get_current_tenant_id());

create policy payment_verifications_update on payment_verifications
  for update using (
    restaurant_id = get_current_tenant_id()
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin', 'manager', 'cashier', 'system_admin')
    )
  );

create policy payment_verifications_delete on payment_verifications
  for delete using (
    restaurant_id = get_current_tenant_id()
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin', 'system_admin')
    )
  );

create trigger set_payment_verifications_updated_at before update on payment_verifications
  for each row execute function update_updated_at_column();

-- Fayda ID Verification

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

create index if not exists idx_fayda_verifications_restaurant on fayda_verifications(restaurant_id);
create index if not exists idx_fayda_verifications_employee on fayda_verifications(employee_id);
create index if not exists idx_fayda_verifications_status on fayda_verifications(verification_status);
create index if not exists idx_fayda_verifications_number on fayda_verifications(fayda_number);

alter table fayda_verifications enable row level security;

create policy fayda_verifications_select on fayda_verifications
  for select using (restaurant_id = get_current_tenant_id());

create policy fayda_verifications_insert on fayda_verifications
  for insert with check (
    restaurant_id = get_current_tenant_id()
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin', 'manager', 'system_admin')
    )
  );

create policy fayda_verifications_update on fayda_verifications
  for update using (
    restaurant_id = get_current_tenant_id()
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin', 'manager', 'system_admin')
    )
  );

create policy fayda_verifications_delete on fayda_verifications
  for delete using (
    restaurant_id = get_current_tenant_id()
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin', 'system_admin')
    )
  );

create trigger set_fayda_verifications_updated_at before update on fayda_verifications
  for each row execute function update_updated_at_column();

create trigger set_customers_updated_at before update on customers
  for each row execute function update_updated_at_column();
create trigger set_coupons_updated_at before update on coupons
  for each row execute function update_updated_at_column();
create trigger set_campaigns_updated_at before update on marketing_campaigns
  for each row execute function update_updated_at_column();

-- ── Phase 10: Expenses ──────────────────────────────────────
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

create index if not exists idx_expenses_restaurant_date on expenses(restaurant_id, expense_date);
create index if not exists idx_expenses_category on expenses(restaurant_id, category);
create index if not exists idx_expenses_branch on expenses(branch_id, expense_date);
create index if not exists idx_expenses_created on expenses(created_at desc);

alter table expenses enable row level security;

create policy expenses_select on expenses
  for select using (
    restaurant_id = get_current_tenant_id()
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin', 'manager', 'owner', 'system_admin')
    )
  );

create policy expenses_insert on expenses
  for insert with check (
    restaurant_id = get_current_tenant_id()
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin', 'manager', 'system_admin')
    )
  );

create policy expenses_update on expenses
  for update using (
    restaurant_id = get_current_tenant_id()
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin', 'manager', 'system_admin')
    )
  );

create policy expenses_delete on expenses
  for delete using (
    restaurant_id = get_current_tenant_id()
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin', 'system_admin')
    )
  );

create trigger set_expenses_updated_at before update on expenses
  for each row execute function update_updated_at_column();

-- ── Schema Cache Reload ──────────────────────────────────────
create or replace function reload_schema()
returns void
language sql
security definer
as $$
  notify pgrst, 'reload schema';
$$;
