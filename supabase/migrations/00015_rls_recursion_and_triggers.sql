-- Fix RLS recursion, anon order insertion, and trigger handling

-- ========== ISSUE A: Fix RLS recursion in profiles_select policy ==========
-- The old policy used a subquery (SELECT FROM profiles) which caused infinite
-- recursion. Replace with SECURITY DEFINER helper function that bypasses RLS.
DROP POLICY IF EXISTS "profiles_select_org" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR restaurant_id = get_my_restaurant_id()
  );

-- ========== ISSUE C: Ensure anonymous users can read tables ==========
DROP POLICY IF EXISTS "tables_anon_select" ON tables;
CREATE POLICY "tables_anon_select" ON tables
  FOR SELECT TO anon USING (true);

-- ========== ISSUE C: Fix orders insert trigger to handle NULL auth.uid() ==========
-- Anonymous users don't have auth.uid(), so the created_by column must be
-- explicitly set to NULL instead of relying on a default that might fail.
CREATE OR REPLACE FUNCTION orders_on_insert()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.created_by = auth.uid();
  ELSE
    NEW.created_by = NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_orders_created_by ON orders;
CREATE TRIGGER set_orders_created_by
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION orders_on_insert();

-- ========== ISSUE D (Round 4): Allow anonymous users to SELECT orders ==========
-- The API route chains .insert().select().single(), so anon users need SELECT
-- permission on orders or the transaction fails with RLS violation.
DROP POLICY IF EXISTS "orders_anon_select" ON orders;
CREATE POLICY "orders_anon_select" ON orders
  FOR SELECT
  TO anon
  USING (true);

-- ========== Round 5: Allow anonymous users to INSERT and SELECT order_items ==========
-- The API route inserts items after the parent order, so anon users need both
-- INSERT and SELECT permissions on order_items or the transaction fails.
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_anon_insert" ON order_items;
DROP POLICY IF EXISTS "order_items_anon_select" ON order_items;

CREATE POLICY "order_items_anon_insert" ON order_items
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "order_items_anon_select" ON order_items
  FOR SELECT TO anon USING (true);
