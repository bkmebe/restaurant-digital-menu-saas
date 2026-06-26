-- RestaurantOS Phase 1: Role Expansion
-- Date: 2026-06-23
-- This migration expands the role enums and adds new role types.

-- 1. Extend profiles.role enum
ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'system_admin';
ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'inventory_manager';
ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'kitchen_staff';

-- 2. Extend employees.role column (if using a custom enum type)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employee_role') THEN
    ALTER TYPE employee_role ADD VALUE IF NOT EXISTS 'system_admin';
    ALTER TYPE employee_role ADD VALUE IF NOT EXISTS 'owner';
    ALTER TYPE employee_role ADD VALUE IF NOT EXISTS 'admin';
    ALTER TYPE employee_role ADD VALUE IF NOT EXISTS 'inventory_manager';
    ALTER TYPE employee_role ADD VALUE IF NOT EXISTS 'kitchen_staff';
  END IF;
END $$;

-- 3. Update existing profiles: ensure all current roles are valid
-- This is a no-op migration for existing data

-- 4. Add Fayda fields to employees (for Phase 7, but schema-first)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS fayda_number TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS fayda_verified BOOLEAN DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS fayda_verified_at TIMESTAMPTZ;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS fayda_transaction_id TEXT;

-- 5. Enhance audit_logs with device info
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS device_info TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS session_id TEXT;

-- 6. Extend organizations table for subscription management
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_plan_id UUID REFERENCES plans(id);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_branches INTEGER DEFAULT 1;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_employees INTEGER DEFAULT 10;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
