-- RestaurantOS Role Architecture Refactor
-- Date: 2026-06-27
-- Ensures all required roles exist in the user_role enum for the new hierarchy:
--   system_admin > owner > inventory_manager > manager > cashier > waiter > kitchen_staff
-- Adds RLS policy updates for the new role structure.

-- 1. Ensure all required roles exist in user_role enum
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'system_admin';
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'owner';
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'inventory_manager';
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'kitchen_staff';
  END IF;
END $$;

-- 2. Also handle the role_type enum if it exists (legacy name)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_type') THEN
    ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'system_admin';
    ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'owner';
    ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'inventory_manager';
    ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'kitchen_staff';
  END IF;
END $$;

-- 3. Ensure employee_role enum has all values if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employee_role') THEN
    ALTER TYPE employee_role ADD VALUE IF NOT EXISTS 'system_admin';
    ALTER TYPE employee_role ADD VALUE IF NOT EXISTS 'owner';
    ALTER TYPE employee_role ADD VALUE IF NOT EXISTS 'inventory_manager';
    ALTER TYPE employee_role ADD VALUE IF NOT EXISTS 'kitchen_staff';
  END IF;
END $$;

-- 4. Update RLS policies on expenses to include inventory_manager who now manages expenses
DROP POLICY IF EXISTS expenses_select ON expenses;
CREATE POLICY expenses_select ON expenses
  FOR SELECT USING (
    restaurant_id = get_current_tenant_id()
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin', 'manager', 'inventory_manager', 'owner', 'system_admin')
    )
  );

DROP POLICY IF EXISTS expenses_insert ON expenses;
CREATE POLICY expenses_insert ON expenses
  FOR INSERT WITH CHECK (
    restaurant_id = get_current_tenant_id()
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin', 'inventory_manager', 'system_admin')
    )
  );

DROP POLICY IF EXISTS expenses_update ON expenses;
CREATE POLICY expenses_update ON expenses
  FOR UPDATE USING (
    restaurant_id = get_current_tenant_id()
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin', 'inventory_manager', 'system_admin')
    )
  );

-- 5. Update payroll RLS to allow inventory_manager (head manager) to manage payroll
DROP POLICY IF EXISTS payrolls_select ON payrolls;
CREATE POLICY payrolls_select ON payrolls
  FOR SELECT USING (
    restaurant_id = get_current_tenant_id()
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin', 'manager', 'inventory_manager', 'owner', 'system_admin')
    )
  );

DROP POLICY IF EXISTS payrolls_insert ON payrolls;
CREATE POLICY payrolls_insert ON payrolls
  FOR INSERT WITH CHECK (
    restaurant_id = get_current_tenant_id()
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin', 'inventory_manager', 'system_admin')
    )
  );

DROP POLICY IF EXISTS payrolls_update ON payrolls;
CREATE POLICY payrolls_update ON payrolls
  FOR UPDATE USING (
    restaurant_id = get_current_tenant_id()
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin', 'inventory_manager', 'system_admin')
    )
  );

-- 6. Update EOD approvals to allow inventory_manager to approve
DROP POLICY IF EXISTS eod_approvals_select ON eod_approvals;
CREATE POLICY eod_approvals_select ON eod_approvals
  FOR SELECT USING (
    exists (
      select 1 from eod_closings ec
      where ec.id = eod_closing_id
        and ec.restaurant_id = get_current_tenant_id()
        and exists (
          select 1 from profiles
          where id = auth.uid()
            and role in ('admin', 'inventory_manager', 'system_admin')
        )
    )
  );

DROP POLICY IF EXISTS eod_approvals_insert ON eod_approvals;
CREATE POLICY eod_approvals_insert ON eod_approvals
  FOR INSERT WITH CHECK (
    exists (
      select 1 from eod_closings ec
      where ec.id = eod_closing_id
        and ec.restaurant_id = get_current_tenant_id()
        and exists (
          select 1 from profiles
          where id = auth.uid()
            and role in ('admin', 'inventory_manager', 'system_admin')
        )
    )
  );
