-- Phase 10E — Fix RLS Infinite Recursion in profiles policies
--
-- Root cause: The admins_all_profiles policy on the profiles table
-- used a self-referencing subquery (SELECT FROM profiles), causing
-- infinite recursion when ANY policy in any table referenced profiles.
--
-- Fix: Create a SECURITY DEFINER helper function that reads the role
-- from profiles while bypassing RLS, and use it only in the profiles
-- table's own policy. All other table policies remain unchanged.

-- Helper: get the current user's role (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Fix only the profiles table's self-referencing policy.
-- All other policies (restaurants, orders, menu_items, etc.)
-- reference profiles from outside the profiles table and are safe.
DROP POLICY IF EXISTS "admins_all_profiles" ON profiles;
CREATE POLICY "admins_all_profiles" ON profiles
  FOR ALL USING (public.get_my_role() = 'admin');
