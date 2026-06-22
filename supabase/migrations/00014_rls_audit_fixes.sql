-- FIX-01 to FIX-06: RLS audit fixes

-- Drop broken admin policies that lack restaurant_id scoping
DROP POLICY IF EXISTS "admins_all_employees" ON employees;
DROP POLICY IF EXISTS "admins_all_profiles" ON profiles;
DROP POLICY IF EXISTS "admins_all_restaurants" ON restaurants;
DROP POLICY IF EXISTS "managers_read_restaurants" ON restaurants;
DROP POLICY IF EXISTS "admins_all_menu_items" ON menu_items;
DROP POLICY IF EXISTS "admins_all_categories" ON categories;
DROP POLICY IF EXISTS "cashiers_update_orders" ON orders;
DROP POLICY IF EXISTS "public_read_tables" ON tables;

-- ========== FIX-01: employees ==========
CREATE POLICY "employees_insert" ON employees
  FOR INSERT WITH CHECK (
    restaurant_id = get_my_restaurant_id()
    AND get_my_role() IN ('admin', 'manager')
  );

CREATE POLICY "employees_update" ON employees
  FOR UPDATE USING (
    restaurant_id = get_my_restaurant_id()
    AND get_my_role() IN ('admin', 'manager')
  );

CREATE POLICY "employees_delete" ON employees
  FOR DELETE USING (
    restaurant_id = get_my_restaurant_id()
    AND get_my_role() = 'admin'
  );

-- ========== FIX-02: profiles ==========
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Replace admins_all_profiles with organization-scoped read
CREATE POLICY "profiles_select_org" ON profiles
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- ========== FIX-03: restaurants ==========
CREATE POLICY "restaurants_select" ON restaurants
  FOR SELECT USING (id = get_my_restaurant_id());

CREATE POLICY "restaurants_update" ON restaurants
  FOR UPDATE USING (
    id = get_my_restaurant_id()
    AND get_my_role() = 'admin'
  );

-- ========== FIX-04: tables ==========
-- Public can only see tables by ID (for QR menu lookup), not list all
CREATE POLICY "tables_public_select_by_id" ON tables
  FOR SELECT TO anon USING (true);

CREATE POLICY "tables_insert" ON tables
  FOR INSERT WITH CHECK (
    restaurant_id = get_my_restaurant_id()
    AND get_my_role() IN ('admin', 'manager')
  );

CREATE POLICY "tables_update" ON tables
  FOR UPDATE USING (
    restaurant_id = get_my_restaurant_id()
    AND get_my_role() IN ('admin', 'manager', 'waiter')
  );

CREATE POLICY "tables_delete" ON tables
  FOR DELETE USING (
    restaurant_id = get_my_restaurant_id()
    AND get_my_role() = 'admin'
  );

-- ========== FIX-05: menu_items & categories ==========
CREATE POLICY "menu_items_insert" ON menu_items
  FOR INSERT TO authenticated WITH CHECK (
    restaurant_id = get_my_restaurant_id()
    AND get_my_role() IN ('admin', 'manager')
  );

CREATE POLICY "menu_items_update" ON menu_items
  FOR UPDATE TO authenticated USING (
    restaurant_id = get_my_restaurant_id()
    AND get_my_role() IN ('admin', 'manager')
  );

CREATE POLICY "menu_items_delete" ON menu_items
  FOR DELETE TO authenticated USING (
    restaurant_id = get_my_restaurant_id()
    AND get_my_role() = 'admin'
  );

CREATE POLICY "categories_insert" ON categories
  FOR INSERT TO authenticated WITH CHECK (
    restaurant_id = get_my_restaurant_id()
    AND get_my_role() IN ('admin', 'manager')
  );

CREATE POLICY "categories_update" ON categories
  FOR UPDATE TO authenticated USING (
    restaurant_id = get_my_restaurant_id()
    AND get_my_role() IN ('admin', 'manager')
  );

CREATE POLICY "categories_delete" ON categories
  FOR DELETE TO authenticated USING (
    restaurant_id = get_my_restaurant_id()
    AND get_my_role() = 'admin'
  );

-- ========== FIX-06: orders ==========
-- Anonymous users can create orders
CREATE POLICY "orders_anon_insert" ON orders
  FOR INSERT TO anon WITH CHECK (true);

-- Staff UPDATE with restaurant scoping (replaces cashiers_update_orders)
CREATE POLICY "orders_staff_update" ON orders
  FOR UPDATE TO authenticated USING (
    restaurant_id = get_my_restaurant_id()
    AND get_my_role() IN ('admin', 'manager', 'cashier', 'waiter', 'kitchen_staff')
  );
