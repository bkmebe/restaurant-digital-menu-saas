-- Restaurant Digital Menu - Initial Database Schema
-- Run this in Supabase SQL Editor

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'cashier', 'waiter');
CREATE TYPE table_status AS ENUM ('available', 'occupied', 'cleaning');
CREATE TYPE order_status AS ENUM ('open', 'preparing', 'served', 'paid');
CREATE TYPE service_request_type AS ENUM ('waiter', 'bill', 'other');
CREATE TYPE service_request_status AS ENUM ('pending', 'acknowledged', 'resolved');
CREATE TYPE payroll_status AS ENUM ('pending', 'paid', 'cancelled');
CREATE TYPE payment_provider AS ENUM ('telebirr', 'cbe_birr', 'bank', 'qr');

-- Restaurants
CREATE TABLE restaurants (
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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'waiter',
  phone TEXT UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  is_mfa_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Categories
CREATE TABLE categories (
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

-- Menu Items
CREATE TABLE menu_items (
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

-- Tables
CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  table_number INTEGER NOT NULL,
  capacity INTEGER DEFAULT 4,
  status table_status DEFAULT 'available',
  qr_code_url TEXT,
  qr_code_data TEXT,
  assigned_waiter_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(restaurant_id, table_number)
);

-- Employees
CREATE TABLE employees (
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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add FK for tables.assigned_waiter_id
ALTER TABLE tables ADD CONSTRAINT fk_tables_waiter FOREIGN KEY (assigned_waiter_id) REFERENCES employees(id);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  table_id UUID REFERENCES tables(id) ON DELETE CASCADE NOT NULL,
  customer_name TEXT,
  status order_status DEFAULT 'open',
  total_amount DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Order Items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Service Requests
CREATE TABLE service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  table_id UUID REFERENCES tables(id) ON DELETE CASCADE NOT NULL,
  type service_request_type NOT NULL,
  status service_request_status DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Payment Configs
CREATE TABLE payment_configs (
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

-- Payrolls
CREATE TABLE payrolls (
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

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  actor_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id, category_id, is_available);
CREATE INDEX idx_orders_table ON orders(table_id, status);
CREATE INDEX idx_service_requests_table ON service_requests(table_id, status);
CREATE INDEX idx_employees_restaurant ON employees(restaurant_id, role);
CREATE INDEX idx_payrolls_employee ON payrolls(employee_id, month, year);
CREATE INDEX idx_audit_logs_restaurant ON audit_logs(restaurant_id, created_at);
CREATE INDEX idx_profiles_restaurant ON profiles(restaurant_id, role);

-- Enable Row Level Security
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Restaurants: admins can CRUD, managers can read
CREATE POLICY "admins_all_restaurants" ON restaurants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "managers_read_restaurants" ON restaurants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Profiles: users can read own, admins can read all
CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "admins_all_profiles" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Categories: customers can read active, staff can read all, admins can CRUD
CREATE POLICY "public_read_categories" ON categories
  FOR SELECT USING (is_active = true);
CREATE POLICY "staff_read_categories" ON categories
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND restaurant_id = categories.restaurant_id)
  );
CREATE POLICY "admins_all_categories" ON categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Menu Items: customers can read available, staff can read all, admins can CRUD
CREATE POLICY "public_read_menu_items" ON menu_items
  FOR SELECT USING (is_available = true);
CREATE POLICY "staff_read_menu_items" ON menu_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND restaurant_id = menu_items.restaurant_id)
  );
CREATE POLICY "admins_all_menu_items" ON menu_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Tables: public can read (for QR), staff can read assigned, admins can CRUD
CREATE POLICY "public_read_tables" ON tables
  FOR SELECT USING (true);
CREATE POLICY "waiters_read_assigned" ON tables
  FOR SELECT USING (assigned_waiter_id IN (SELECT id FROM employees WHERE profile_id = auth.uid()));
CREATE POLICY "admins_all_tables" ON tables
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Employees: staff can read, admins can CRUD
CREATE POLICY "staff_read_employees" ON employees
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND restaurant_id = employees.restaurant_id)
  );
CREATE POLICY "admins_all_employees" ON employees
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Orders: waiters can CRUD their tables, cashiers can update, managers can read, admins all
CREATE POLICY "waiters_orders" ON orders
  FOR ALL USING (
    table_id IN (
      SELECT id FROM tables WHERE assigned_waiter_id IN (
        SELECT id FROM employees WHERE profile_id = auth.uid()
      )
    )
  );
CREATE POLICY "cashiers_update_orders" ON orders
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'cashier')
  );
CREATE POLICY "staff_read_orders" ON orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND restaurant_id = orders.restaurant_id)
  );

-- Service Requests: public can create (from table), staff can read/update assigned
CREATE POLICY "public_create_service_requests" ON service_requests
  FOR INSERT WITH CHECK (true);
CREATE POLICY "staff_read_service_requests" ON service_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND restaurant_id = service_requests.restaurant_id)
  );
CREATE POLICY "waiters_update_service_requests" ON service_requests
  FOR UPDATE USING (
    table_id IN (
      SELECT id FROM tables WHERE assigned_waiter_id IN (
        SELECT id FROM employees WHERE profile_id = auth.uid()
      )
    )
  );

-- Payment Configs: public can read active, admins can CRUD
CREATE POLICY "public_read_payment_configs" ON payment_configs
  FOR SELECT USING (is_active = true);
CREATE POLICY "admins_all_payment_configs" ON payment_configs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Payrolls: managers can read, admins can CRUD
CREATE POLICY "managers_read_payrolls" ON payrolls
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );
CREATE POLICY "admins_all_payrolls" ON payrolls
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Audit Logs: admins only
CREATE POLICY "admins_all_audit_logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_restaurants_updated_at
  BEFORE UPDATE ON restaurants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to calculate net pay
CREATE OR REPLACE FUNCTION calculate_net_pay()
RETURNS TRIGGER AS $$
BEGIN
  NEW.net_pay = NEW.salary + NEW.bonuses - NEW.deductions;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_payroll_net_pay
  BEFORE INSERT OR UPDATE ON payrolls FOR EACH ROW EXECUTE FUNCTION calculate_net_pay();
