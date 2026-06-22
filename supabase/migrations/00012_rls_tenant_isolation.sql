-- RLS Tenant Isolation Fix
-- Scopes admin/manger policies by restaurant_id to prevent cross-tenant leaks.
-- Targets: payrolls, audit_logs, tables, order_items, subscriptions

-- ============================================================
-- 1. PAYROLLS — scope admin/manager policies by restaurant_id
-- ============================================================
DROP POLICY IF EXISTS "managers_read_payrolls" ON payrolls;
DROP POLICY IF EXISTS "admins_all_payrolls" ON payrolls;

CREATE POLICY "managers_read_payrolls" ON payrolls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
        AND restaurant_id = payrolls.restaurant_id
    )
  );

CREATE POLICY "admins_all_payrolls" ON payrolls
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND restaurant_id = payrolls.restaurant_id
    )
  );

-- ============================================================
-- 2. AUDIT LOGS — add restaurant_id scoping to existing policies
-- ============================================================
DROP POLICY IF EXISTS "service_role_all_audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "admins_all_audit_logs" ON audit_logs;

CREATE POLICY "admins_read_audit_logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND restaurant_id = audit_logs.restaurant_id
    )
  );

CREATE POLICY "service_role_all_audit_logs" ON audit_logs
  FOR ALL USING (current_setting('role') = 'service_role');

-- ============================================================
-- 3. TABLES — scope admin policy by restaurant_id
-- ============================================================
DROP POLICY IF EXISTS "admins_all_tables" ON tables;

CREATE POLICY "admins_all_tables" ON tables
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND restaurant_id = tables.restaurant_id
    )
  );

-- ============================================================
-- 4. ORDER ITEMS — add policies via order join for restaurant_id
-- ============================================================
DROP POLICY IF EXISTS "staff_read_order_items" ON order_items;
DROP POLICY IF EXISTS "staff_insert_order_items" ON order_items;
DROP POLICY IF EXISTS "staff_update_order_items" ON order_items;

CREATE POLICY "staff_read_order_items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN profiles ON profiles.id = auth.uid()
        AND profiles.restaurant_id = orders.restaurant_id
      WHERE orders.id = order_items.order_id
    )
  );

CREATE POLICY "staff_insert_order_items" ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      JOIN profiles ON profiles.id = auth.uid()
        AND profiles.restaurant_id = orders.restaurant_id
      WHERE orders.id = order_items.order_id
    )
  );

CREATE POLICY "staff_update_order_items" ON order_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN profiles ON profiles.id = auth.uid()
        AND profiles.restaurant_id = orders.restaurant_id
      WHERE orders.id = order_items.order_id
    )
  );

-- ============================================================
-- 5. SUBSCRIPTIONS — add policies via organization_users
-- Note: table may not exist on all environments, so wrap in DO
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'subscriptions') THEN
    CREATE POLICY "org_read_subscriptions" ON subscriptions
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM organization_users
          WHERE profile_id = auth.uid()
            AND organization_id = subscriptions.organization_id
        )
      );

    CREATE POLICY "org_admin_subscriptions" ON subscriptions
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM organization_users
          WHERE profile_id = auth.uid()
            AND organization_id = subscriptions.organization_id
            AND role IN ('owner', 'admin')
        )
      );
  END IF;
END $$;
