-- ============================================================
-- TEST SEED DATA — Multi-Tenant Restaurant & Menu System
-- Run this against a STAGING Supabase instance only.
-- WARNING: This will clear existing data.
-- ============================================================

DO $$
DECLARE
  org_a_id     UUID := '00000000-0000-0000-0000-000000000001';
  org_b_id     UUID := '00000000-0000-0000-0000-000000000002';

  rest_a_id    UUID := '00000000-0000-0000-0000-000000000010';
  rest_b_id    UUID := '00000000-0000-0000-0000-000000000011';
  rest_c_id    UUID := '00000000-0000-0000-0000-000000000012';

  branch_a1_id UUID := '00000000-0000-0000-0000-000000000020';
  branch_a2_id UUID := '00000000-0000-0000-0000-000000000021';
  branch_b1_id UUID := '00000000-0000-0000-0000-000000000022';

  cat_food_id  UUID := 'c0000001-0000-0000-0000-000000000001';
  cat_drink_id UUID := 'c0000001-0000-0000-0000-000000000002';
  cat_dessert_id UUID := 'c0000001-0000-0000-0000-000000000003';
  cat_empty_id UUID := 'c0000001-0000-0000-0000-000000000099';

  tbl_ids UUID[] := ARRAY[
    't0000001-0000-0000-0000-000000000001',
    't0000001-0000-0000-0000-000000000002',
    't0000001-0000-0000-0000-000000000003',
    't0000001-0000-0000-0000-000000000004',
    't0000001-0000-0000-0000-000000000005',
    't0000001-0000-0000-0000-000000000006',
    't0000001-0000-0000-0000-000000000007',
    't0000001-0000-0000-0000-000000000008',
    't0000001-0000-0000-0000-000000000009',
    't0000001-0000-0000-0000-000000000010'
  ];

  emp_ids UUID[] := ARRAY[
    'e0000001-0000-0000-0000-000000000001',
    'e0000001-0000-0000-0000-000000000002',
    'e0000001-0000-0000-0000-000000000003',
    'e0000001-0000-0000-0000-000000000004',
    'e0000001-0000-0000-0000-000000000005'
  ];

  item_ids UUID[] := ARRAY[
    'i0000001-0000-0000-0000-000000000001',
    'i0000001-0000-0000-0000-000000000002',
    'i0000001-0000-0000-0000-000000000003',
    'i0000001-0000-0000-0000-000000000004',
    'i0000001-0000-0000-0000-000000000005',
    'i0000001-0000-0000-0000-000000000006',
    'i0000001-0000-0000-0000-000000000007'
  ];

  i INT;
BEGIN

  -- ============================================================
  -- ORGANIZATIONS (2 tenants)
  -- ============================================================
  INSERT INTO organizations (id, name, slug, email, phone, address, onboarding_step, setup_completed) VALUES
    (org_a_id, 'Buna Hospitality Group', 'buna-group', 'admin@bunagroup.com', '+251911111111', 'Bole Road, Addis Ababa', 6, true),
    (org_b_id, 'Lalibela Eateries', 'lalibela-eats', 'admin@lalibela.com', '+251922222222', 'Merkato, Addis Ababa', 6, true);

  -- ============================================================
  -- BRANCHES (3 branches)
  -- ============================================================
  INSERT INTO branches (id, organization_id, name, address, phone, email, currency, tax_rate) VALUES
    (branch_a1_id, org_a_id, 'Buna Cafe - Bole',   'Bole Road, Addis Ababa',  '+251911111111', 'bole@bunacafe.com', 'ETB', 0.15),
    (branch_a2_id, org_a_id, 'Buna Cafe - Summit',  'Summit, Addis Ababa',     '+251911111112', 'summit@bunacafe.com', 'ETB', 0.15),
    (branch_b1_id, org_b_id, 'Lalibela - Merkato',  'Merkato, Addis Ababa',    '+251922222221', 'merkato@lalibela.com', 'ETB', 0.15);

  -- ============================================================
  -- RESTAURANTS (3 restaurants, linked to branches)
  -- ============================================================
  INSERT INTO restaurants (id, name, slug, phone, email, address, currency, tax_rate, organization_id, branch_id) VALUES
    (rest_a_id, 'Buna Cafe Bole',  'buna-cafe-bole',  '+251911111111', 'bole@bunacafe.com',   'Bole Road', 'ETB', 0.15, org_a_id, branch_a1_id),
    (rest_b_id, 'Buna Cafe Summit', 'buna-cafe-summit', '+251911111112', 'summit@bunacafe.com', 'Summit',    'ETB', 0.15, org_a_id, branch_a2_id),
    (rest_c_id, 'Lalibela Merkato', 'lalibela-merkato', '+251922222221', 'merkato@lalibela.com', 'Merkato',  'ETB', 0.15, org_b_id, branch_b1_id);

  -- ============================================================
  -- CATEGORIES (with one empty category for edge case testing)
  -- ============================================================
  INSERT INTO categories (id, restaurant_id, name, name_am, name_om, icon, sort_order, is_active) VALUES
    (cat_food_id,  rest_a_id, 'Main Dishes',       'ዋና ምግቦች',          'Nyaata Guddaa',  '🍛', 1, true),
    (cat_drink_id, rest_a_id, 'Drinks',            'መጠጦች',             'Dhugaatii',      '🥤', 2, true),
    (cat_dessert_id, rest_a_id, 'Desserts',        'ጣፋጭ ምግቦች',        'Maakuuxa',       '🍰', 3, true),
    (cat_food_id,  rest_b_id, 'Main Dishes',       'ዋና ምግቦች',          'Nyaata Guddaa',  '🍛', 1, true),
    (cat_drink_id, rest_b_id, 'Beverages',         'መጠጦች',             'Dhugaatii',      '🥤', 2, true),
    -- Edge case: empty category with no items
    (cat_empty_id, rest_a_id, 'Empty Category',    'ባዶ ምድብ',           'Ramaddii Duwwaa', '', 99, true);

  -- ============================================================
  -- TABLES (10 tables for rest_a, 5 for rest_b, 5 for rest_c)
  -- ============================================================
  FOR i IN 1..10 LOOP
    INSERT INTO tables (id, restaurant_id, table_number, capacity, status)
    VALUES (tbl_ids[i], rest_a_id, i, 4, CASE WHEN i <= 3 THEN 'occupied' WHEN i = 4 THEN 'cleaning' ELSE 'available' END);
  END LOOP;

  FOR i IN 1..5 LOOP
    INSERT INTO tables (id, restaurant_id, table_number, capacity, status)
    VALUES (gen_random_uuid(), rest_b_id, i, 4, 'available');
  END LOOP;

  FOR i IN 1..5 LOOP
    INSERT INTO tables (id, restaurant_id, table_number, capacity, status)
    VALUES (gen_random_uuid(), rest_c_id, i, 4, 'available');
  END LOOP;

  -- ============================================================
  -- MENU ITEMS
  -- ============================================================
  INSERT INTO menu_items (id, restaurant_id, category_id, name, name_am, name_om, description, price, image_url, is_available, is_featured, sort_order) VALUES
    (item_ids[1], rest_a_id, cat_food_id, 'Doro Wat',     'ዶሮ ወጥ',  'Doro Weet', 'Spicy chicken stew with injera', 250, 'https://picsum.photos/seed/doro-wat/400/300', true, true, 1),
    (item_ids[2], rest_a_id, cat_food_id, 'Kitfo',        'ክትፎ',   'Kitfo',     'Minced raw beef with spices',    350, 'https://picsum.photos/seed/kitfo/400/300', true, true, 2),
    (item_ids[3], rest_a_id, cat_food_id, 'Tibs',         'ጥብስ',    'Tibs',      'Sautéed meat with vegetables',    280, 'https://picsum.photos/seed/tibs/400/300', true, false, 3),
    (item_ids[4], rest_a_id, cat_drink_id, 'Ethiopian Coffee', 'ቡና', 'Buna',    'Traditional coffee ceremony',      50, 'https://picsum.photos/seed/coffee/400/300', true, true, 4),
    (item_ids[5], rest_a_id, cat_drink_id, 'Mango Juice', 'ማንጎ ጁስ', 'Mangoo',  'Fresh mango juice',               80, null, true, false, 5),
    -- Edge case: unavailable item
    (item_ids[6], rest_a_id, cat_dessert_id, 'Tiramisu', 'ቲራሚሱ', 'Tiramisu', 'Italian coffee dessert',          180, null, false, false, 6),
    -- Edge case: zero-price item
    (item_ids[7], rest_a_id, cat_food_id, 'Free Water',   'ነጻ ውሃ',  'Bishaan',   'Complimentary still water',        0,  null, true, false, 7);

  -- Items for rest_b (subset)
  INSERT INTO menu_items (restaurant_id, category_id, name, name_am, name_om, description, price, image_url, is_available, is_featured, sort_order) VALUES
    (rest_b_id, cat_food_id, 'Shiro',  'ሽሮ', 'Shiro',   'Chickpea stew', 180, 'https://picsum.photos/seed/shiro/400/300', true, true, 1),
    (rest_b_id, cat_drink_id, 'Tea',   'ሻይ', 'Shayee',  'Ethiopian tea',  35, null, true, false, 2);

  -- Items for rest_c
  INSERT INTO menu_items (restaurant_id, category_id, name, name_am, name_om, description, price, image_url, is_available, is_featured, sort_order) VALUES
    (rest_c_id, cat_food_id, 'Injera with Shiro', 'እንጀራ ከሽሮ ጋር', 'Injira Shiro', 'Injera with chickpea stew', 200, null, true, true, 1),
    (rest_c_id, cat_drink_id, 'Spiced Tea',       'ቅመም ሻይ',      'Shayee Urgoo',  'Tea with spices',           45,  null, true, false, 2);

  -- ============================================================
  -- SERVICE REQUESTS (mixed states)
  -- ============================================================
  INSERT INTO service_requests (restaurant_id, table_id, type, status, notes) VALUES
    (rest_a_id, tbl_ids[1], 'waiter', 'pending',      'Need more injera'),
    (rest_a_id, tbl_ids[2], 'bill',   'acknowledged', 'Ready to pay'),
    (rest_a_id, tbl_ids[3], 'other',  'resolved',     'Spilled water cleaned');

  -- ============================================================
  -- PAYROLLS (current month for rest_a)
  -- ============================================================
  INSERT INTO payrolls (restaurant_id, employee_id, month, year, salary, bonuses, deductions, net_pay, status) VALUES
    (rest_a_id, emp_ids[1], 6, 2026, 15000, 2000, 1500, 15500, 'paid'),
    (rest_a_id, emp_ids[2], 6, 2026,  8000,    0,  500,  7500, 'pending'),
    (rest_a_id, emp_ids[3], 6, 2026, 12000, 1000, 1000, 12000, 'pending'),
    (rest_a_id, emp_ids[4], 6, 2026,  6000,    0,    0,  6000, 'pending'),
    (rest_a_id, emp_ids[5], 6, 2026,  4500,  500,  200,  4800, 'paid');

  -- ============================================================
  -- SUBSCRIPTIONS
  -- ============================================================
  INSERT INTO subscriptions (organization_id, plan_id, status, current_period_start, current_period_end) VALUES
    (org_a_id, (SELECT id FROM subscription_plans LIMIT 1), 'active',  '2026-01-01', '2026-12-31'),
    (org_b_id, (SELECT id FROM subscription_plans LIMIT 1), 'active',  '2026-06-01', '2026-07-01'),
    (org_a_id, (SELECT id FROM subscription_plans LIMIT 1), 'expired', '2025-01-01', '2025-12-31');

  -- ============================================================
  -- AUDIT LOGS
  -- ============================================================
  INSERT INTO audit_logs (restaurant_id, actor_id, action, table_name, created_at) VALUES
    (rest_a_id, '00000000-0000-0000-0000-000000000001', 'Created menu item "Doro Wat"',       'menu_items',  NOW() - INTERVAL '2 hours'),
    (rest_a_id, '00000000-0000-0000-0000-000000000001', 'Updated employee "Abebe"',           'employees',   NOW() - INTERVAL '3 hours'),
    (rest_a_id, '00000000-0000-0000-0000-000000000002', 'Processed payroll for June',         'payrolls',    NOW() - INTERVAL '5 hours'),
    (rest_a_id, '00000000-0000-0000-0000-000000000001', 'Deleted category "Specials"',        'categories',  NOW() - INTERVAL '1 day'),
    (rest_a_id, '00000000-0000-0000-0000-000000000002', 'Updated table 3 status to occupied',  'tables',      NOW() - INTERVAL '30 minutes');

  RAISE NOTICE '=== SEED COMPLETE ===';
  RAISE NOTICE 'Organizations: 2';
  RAISE NOTICE 'Branches: 3';
  RAISE NOTICE 'Restaurants: 3';
  RAISE NOTICE 'Categories: %', (SELECT COUNT(*) FROM categories);
  RAISE NOTICE 'Menu Items: %', (SELECT COUNT(*) FROM menu_items);
  RAISE NOTICE 'Tables: %', (SELECT COUNT(*) FROM tables);
  RAISE NOTICE 'Service Requests: %', (SELECT COUNT(*) FROM service_requests);
  RAISE NOTICE 'Payrolls: %', (SELECT COUNT(*) FROM payrolls);
  RAISE NOTICE 'Audit Logs: %', (SELECT COUNT(*) FROM audit_logs);
  RAISE NOTICE 'Subscriptions: %', (SELECT COUNT(*) FROM subscriptions);
END $$;
