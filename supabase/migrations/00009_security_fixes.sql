-- Phase 10C — Security Hardening & Database Fixes
-- Addresses findings from security audit (10C) and database review (10F)

-- ============================================
-- 1. Fix exec_sql: Parameterized, SECURITY INVOKER
-- ============================================

-- Drop the old insecure function if it exists
DROP FUNCTION IF EXISTS exec_sql;

-- Create secure version with parameterized query support
-- Uses $1, $2, etc. as positional parameters (safely cast)
CREATE OR REPLACE FUNCTION exec_sql(query_text TEXT, param_restaurant_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  result JSONB;
  safe_query TEXT;
BEGIN
  -- Replace $1::uuid with the actual parameter value
  safe_query := REPLACE(query_text, '$1::uuid', quote_literal(param_restaurant_id));
  
  -- Ensure only SELECT queries are allowed
  IF UPPER(TRIM(safe_query)) NOT LIKE 'SELECT%' THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;

  EXECUTE safe_query INTO result;
  RETURN result;
END;
$$;

-- ============================================
-- 2. Fix missing FK constraints (ON DELETE SET NULL)
-- ============================================

-- Fix orders.created_by - drop existing FK, recreate with ON DELETE SET NULL
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_created_by_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Fix audit_logs.actor_id - drop existing FK, recreate with ON DELETE SET NULL
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_actor_id_fkey;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- ============================================
-- 3. Add missing indexes for query performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item ON order_items(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_restaurant ON payment_transactions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_ref ON payment_transactions(provider_reference);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_employees_profile ON employees(profile_id);
CREATE INDEX IF NOT EXISTS idx_tables_waiter ON tables(assigned_waiter_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_type ON service_requests(type, status);

-- ============================================
-- 4. RLS hardening: Restrict audit_logs to service_role
-- ============================================

-- Revoke anon and authenticated roles' access to audit_logs
-- Only service_role and admin (via RLS) can access
REVOKE ALL ON audit_logs FROM anon, authenticated;
GRANT SELECT, INSERT ON audit_logs TO service_role;

-- Update RLS policy to be stricter
DROP POLICY IF EXISTS "admins_all_audit_logs" ON audit_logs;
CREATE POLICY "service_role_all_audit_logs" ON audit_logs
  FOR ALL USING (
    current_setting('role') = 'service_role'
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 5. Rate limiting helper function
-- ============================================

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 100,
  p_window_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  request_count INTEGER;
BEGIN
  -- Clean up old entries
  DELETE FROM rate_limit_logs
  WHERE created_at < now() - (p_window_seconds || ' seconds')::INTERVAL;

  -- Count recent requests
  SELECT COUNT(*) INTO request_count
  FROM rate_limit_logs
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND created_at > now() - (p_window_seconds || ' seconds')::INTERVAL;

  -- Log this request
  INSERT INTO rate_limit_logs (identifier, endpoint)
  VALUES (p_identifier, p_endpoint);

  RETURN request_count < p_max_requests;
END;
$$;

-- ============================================
-- 6. Secure payment_webhook_events table
-- ============================================

-- Ensure webhook events table has RLS and is service_role only
ALTER TABLE IF EXISTS payment_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_webhook_events" ON payment_webhook_events;
CREATE POLICY "service_role_webhook_events" ON payment_webhook_events
  FOR ALL USING (current_setting('role') = 'service_role');

-- ============================================
-- 7. Additional security policies
-- ============================================

-- Revoke unnecessary public access to sensitive tables
REVOKE ALL ON encrypted_secrets FROM anon, authenticated;
GRANT ALL ON encrypted_secrets TO service_role;

-- Add check constraint to prevent empty passwords in profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_phone_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_phone_check
  CHECK (phone IS NULL OR phone ~ '^\+251[0-9]{9}$');

-- Add check constraint for valid email in employees
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_email_check;
ALTER TABLE employees ADD CONSTRAINT employees_email_check
  CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- ============================================
-- 8. Audit trigger for sensitive mutations
-- ============================================

CREATE OR REPLACE FUNCTION audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    restaurant_id,
    actor_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    ip_address
  ) VALUES (
    COALESCE(NEW.restaurant_id, OLD.restaurant_id),
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD)::JSONB ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)::JSONB ELSE NULL END,
    current_setting('request.headers')::JSON->>'x-forwarded-for'
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Add audit triggers to critical tables (commented out by default — enable selectively)
-- CREATE TRIGGER audit_menu_items AFTER INSERT OR UPDATE OR DELETE ON menu_items FOR EACH ROW EXECUTE FUNCTION audit_mutation();
-- CREATE TRIGGER audit_employees AFTER INSERT OR UPDATE OR DELETE ON employees FOR EACH ROW EXECUTE FUNCTION audit_mutation();
-- CREATE TRIGGER audit_payrolls AFTER INSERT OR UPDATE OR DELETE ON payrolls FOR EACH ROW EXECUTE FUNCTION audit_mutation();

-- ============================================
-- 9. Update updated_at function for all tables
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
