-- Phase 11: Restaurant Onboarding System

-- Add onboarding tracking columns
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT false;

-- Create function to handle new user registration (bypasses RLS)
CREATE OR REPLACE FUNCTION public.create_restaurant_setup(
  org_name TEXT,
  org_slug TEXT,
  user_id UUID,
  user_email TEXT,
  user_full_name TEXT,
  user_phone TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  new_restaurant_id UUID;
  new_branch_id UUID;
BEGIN
  -- Create organization
  INSERT INTO organizations (name, slug, email, onboarding_step, setup_completed)
  VALUES (org_name, org_slug, user_email, 1, false)
  RETURNING id INTO new_org_id;

  -- Create restaurant
  INSERT INTO restaurants (name, slug, email, organization_id)
  VALUES (org_name, org_slug || '-rest', user_email, new_org_id)
  RETURNING id INTO new_restaurant_id;

  -- Create default branch
  INSERT INTO branches (organization_id, name)
  VALUES (new_org_id, 'Main Branch')
  RETURNING id INTO new_branch_id;

  -- Update restaurant with branch
  UPDATE restaurants SET branch_id = new_branch_id WHERE id = new_restaurant_id;

  -- Create profile (admin role)
  INSERT INTO profiles (id, restaurant_id, organization_id, role, full_name, phone)
  VALUES (user_id, new_restaurant_id, new_org_id, 'admin', user_full_name, user_phone)
  ON CONFLICT (id) DO UPDATE SET
    restaurant_id = EXCLUDED.restaurant_id,
    organization_id = EXCLUDED.organization_id,
    role = 'admin',
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone;

  -- Create organization user link
  INSERT INTO organization_users (organization_id, profile_id, role)
  VALUES (new_org_id, user_id, 'owner');

  RETURN JSONB_BUILD_OBJECT(
    'organization_id', new_org_id,
    'restaurant_id', new_restaurant_id,
    'branch_id', new_branch_id
  );
END;
$$;

-- Function to get onboarding status
CREATE OR REPLACE FUNCTION public.get_onboarding_status(p_organization_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT JSONB_BUILD_OBJECT(
    'step', onboarding_step,
    'completed', setup_completed
  ) INTO result
  FROM organizations
  WHERE id = p_organization_id;

  RETURN COALESCE(result, JSONB_BUILD_OBJECT('step', 0, 'completed', false));
END;
$$;

-- Function to get popular menu items for a restaurant
CREATE OR REPLACE FUNCTION public.get_popular_items(rest_id UUID)
RETURNS TABLE(name TEXT, count BIGINT, revenue NUMERIC)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mi.name,
    SUM(oi.quantity)::BIGINT AS count,
    SUM(oi.subtotal) AS revenue
  FROM order_items oi
  JOIN menu_items mi ON mi.id = oi.menu_item_id
  JOIN orders o ON o.id = oi.order_id
  WHERE o.restaurant_id = rest_id
    AND o.status NOT IN ('cancelled')
  GROUP BY mi.id, mi.name
  ORDER BY count DESC
  LIMIT 20;
END;
$$;
