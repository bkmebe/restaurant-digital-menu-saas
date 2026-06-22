-- Restaurant Digital Menu - Demo Seed Data
-- Run this to populate a demo restaurant with sample data

-- Only seed if no restaurants exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM restaurants LIMIT 1) THEN
    RAISE NOTICE 'Restaurants already exist, skipping seed';
    RETURN;
  END IF;

  -- 1. Create organization
  INSERT INTO organizations (id, name, slug, email, phone, address, onboarding_step, setup_completed)
  VALUES ('00000000-0000-0000-0000-000000000001', 'Buna Cafe', 'buna-cafe', 'admin@bunacafe.com', '+251911111111', 'Bole Road, Addis Ababa', 6, true);

  -- 2. Create restaurant
  INSERT INTO restaurants (id, name, slug, phone, email, address, currency, tax_rate, organization_id)
  VALUES ('00000000-0000-0000-0000-000000000002', 'Buna Cafe', 'buna-cafe-rest', '+251911111111', 'info@bunacafe.com', 'Bole Road, Addis Ababa', 'ETB', 0.15, '00000000-0000-0000-0000-000000000001');

  -- 3. Create branch
  INSERT INTO branches (id, organization_id, name, address, phone, email)
  VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Main Branch', 'Bole Road, Addis Ababa', '+251911111111', 'buna@cafe.com');

  -- Link branch to restaurant
  UPDATE restaurants SET branch_id = '00000000-0000-0000-0000-000000000003' WHERE id = '00000000-0000-0000-0000-000000000002';

  -- 4. Create demo users (profiles) — these need corresponding auth.users entries
  -- Note: Real user accounts should be created via Supabase Auth admin API
  -- These profile entries serve as references for the demo data

  -- 5. Create categories
  INSERT INTO categories (id, restaurant_id, name, name_am, name_om, icon, sort_order, is_active) VALUES
    ('c0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Main Dishes', 'ዋና ምግቦች', 'Nyaata Guddaa', '🍛', 1, true),
    ('c0000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Sambusa & Appetizers', 'ሳምቡሳ እና መክሰስ', 'Sambusa fi Nyaata Jalqabaa', '🥟', 2, true),
    ('c0000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Drinks', 'መጠጦች', 'Dhugaatii', '🥤', 3, true),
    ('c0000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'Desserts', 'ጣፋጭ ምግቦች', 'Maakuuxa', '🍰', 4, true);

  -- 6. Create menu items
  INSERT INTO menu_items (restaurant_id, category_id, name, name_am, name_om, description, description_am, description_om, price, is_available, is_featured, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'Doro Wat', 'ዶሮ ወጥ', 'Doro Weet', 'Spicy chicken stew with berbere spice, served with injera', 'በበርበሬ ቅመም የተሰራ ዶሮ ወጥ ከእንጀራ ጋር', 'Doro Weet urgoo berbere qabu, injira wajjin', 250, true, true, 1),
    ('00000000-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'Kitfo', 'ክትፎ', 'Kitfo', 'Minced raw beef seasoned with mitmita and niter kibbeh', 'በሚጥሚጣ እና በንጥር ቅቤ የተቀመመ ጥሬ የበሬ ሥጋ', 'Foon sa'a'ii mitmiitaan fi dhadhaa nitteriidhaan kan mi’eeffame', 350, true, true, 2),
    ('00000000-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'Tibs', 'ጥብስ', 'Tibsi', 'Sautéed beef or lamb with onions, peppers, and rosemary', 'በሽንኩርት፣ በበርበሬ እና በጥብቅ ቅጠል የተጠበሰ የበሬ ወይም የበግ ሥጋ', 'Foon sa'a'ii ykn hoolaa shunkurtii, barbaree fi qacarree wajjin, waan tt'ee', 280, true, false, 3),
    ('00000000-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'Shiro', 'ሽሮ', 'Shiro', 'Chickpea stew with berbere and garlic, vegan-friendly', 'ከበርበሬ እና ነጭ ሽንኩርት ጋር የተሰራ ሽምብራ ወጥ', 'Shiro berbereen fi qullubbii adii wajjin, vegan-friendly', 180, true, false, 4),
    ('00000000-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'Gomen Besiga', 'ጎመን በሥጋ', 'Gomen Besiga', 'Collard greens cooked with beef and spices', 'ከበሬ ሥጋ እና ቅመሞች ጋር የተሰራ ጎመን', 'Gomen foon sa'a'ii fi mi'eessituu wajjin bilcheeme', 220, true, false, 5),
    ('00000000-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'Injera (1kg)', 'እንጀራ (1 ኪ.ግ)', 'Injira (1kg)', 'Traditional Ethiopian sourdough flatbread, 1kg portion', 'ባህላዊ የኢትዮጵያ እንጀራ፣ 1 ኪሎ ግራም', 'Buddeenin baqqana, 1kg', 100, true, false, 6),
    ('00000000-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'Firfir', 'ፍርፍር', 'Firfir', 'Shredded injera mixed with berbere sauce and clarified butter', 'የተቆረጠ እንጀራ ከበርበሬ መረቅ እና ከንጥር ቅቤ ጋር', 'Injira ciccitaa berbere fi dhadhaa qulqulluun wal makiinsa', 150, true, false, 7),
    ('00000000-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'Beyaynetu', 'ብያይነቱ', 'Beyaynetu', 'Vegetarian platter with assorted Ethiopian dishes', 'የተለያዩ የኢትዮጵያ ምግቦች የተካተቱበት የቬጀቴሪያን መድረክ', 'Qiraa warqaanaa kan nyaata addaa addaa', 300, true, true, 8),

    ('00000000-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000002', 'Sambusa (Beef)', 'ሳምቡሳ (በሬ)', 'Sambusa (Sa'a)', 'Deep-fried pastry filled with seasoned ground beef', 'በተቀመመ የበሬ ሥጋ የተሞላ የተጠበሰ ሳምቡሳ', 'Sambusa foon sa'a'iidhaan kan guute, zayitiiin tt'ee', 80, true, false, 1),
    ('00000000-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000002', 'Sambusa (Lentil)', 'ሳምቡሳ (ምስር)', 'Sambusa (Mishira)', 'Deep-fried pastry filled with spiced red lentils', 'በተቀመመ ምስር የተሞላ የተጠበሰ ሳምቡሳ', 'Sambusa misra mi'eessituudhaan kan guute, zayitiiin tt'ee', 60, true, false, 2),
    ('00000000-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000002', 'Bayenetu Platter', 'ብያይነቱ መድረክ', 'Bayenetu Qiraa', 'Assorted vegetarian dishes served in small portions', 'የተለያዩ የቬጀቴሪያን ምግቦች በአነስተኛ ክፍል', 'Nyaata warqaanii addaa addaa, baay'ina xinnoo tajaajilu', 350, true, false, 3),

    ('00000000-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000003', 'Ethiopian Coffee', 'ኢትዮጵያ ቡና', 'Buna Itoophiyaa', 'Traditional Ethiopian coffee ceremony serving', 'ባህላዊ የኢትዮጵያ ቡና ሥነ ሥርዓት', 'Aadaa bunaa Itoophiyaa', 50, true, true, 1),
    ('00000000-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000003', 'Tej (Honey Wine)', 'ጠጅ', 'Tej', 'Traditional Ethiopian honey wine, 500ml', 'ባህላዊ የኢትዮጵያ ማር ወይን፣ 500 ሚ.ሊ', 'Daadhii Itoophiyaa', 120, true, false, 2),
    ('00000000-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000003', 'Fresh Juice', 'ትኩስ ጭማቂ', 'Kuwaarii Haaraa', 'Freshly squeezed mango, papaya, or avocado juice', 'እንደ ማንጎ፣ ፓፓያ ወይም አቮካዶ ያሉ ትኩስ ጭማቂዎች', 'Mango, paappayyaa ykn avokaadoo, haaraa cuunfame', 80, true, false, 3),
    ('00000000-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000003', 'Sprite', 'ስፕራይት', 'Sprite', 'Carbonated soft drink, 330ml can', 'የካርቦን ለስላሳ መጠጥ፣ 330 ሚ.ሊ', 'Dhugaatii Softii kan kaarboonii qabu', 40, true, false, 4),

    ('00000000-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000004', 'Kicha', 'ቂጣ', 'Kichaa', 'Sweet bread with raisins and cardamom', 'ዘቢብ እና ከርዳሞም ያለው ጣፋጭ እንጀራ', 'Maxinoo mi'ee kan zabiiibiifi kaardaamoomii qabu', 60, true, false, 1),
    ('00000000-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000004', 'Halwa', 'ሃልዋ', 'Halwa', 'Traditional sesame-based sweet dessert', 'ባህላዊ የሰሊጥ ጣፋጭ ምግብ', 'Maakuuxa saliidadhaan kan mi'eessu', 70, true, false, 2);

  -- 7. Create tables
  INSERT INTO tables (id, restaurant_id, table_number, capacity, status) VALUES
    ('t0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 1, 2, 'available'),
    ('t0000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 2, 2, 'available'),
    ('t0000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 3, 4, 'available'),
    ('t0000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 4, 4, 'available'),
    ('t0000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', 5, 6, 'available'),
    ('t0000001-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', 6, 6, 'available'),
    ('t0000001-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000002', 7, 8, 'occupied'),
    ('t0000001-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000002', 8, 4, 'available'),
    ('t0000001-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000002', 9, 2, 'available'),
    ('t0000001-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', 10, 4, 'cleaning');

  -- 8. Create employees
  INSERT INTO employees (id, restaurant_id, full_name, phone, email, role, salary, hire_date, digital_employee_id, is_active) VALUES
    ('e0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Abebe Kebede', '+251911111101', 'abebe@bunacafe.com', 'admin', 25000, '2024-01-15', 'RMD-BUNA-2024-0001', true),
    ('e0000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Almaz Tadesse', '+251911111102', 'almaz@bunacafe.com', 'manager', 18000, '2024-02-01', 'RMD-BUNA-2024-0002', true),
    ('e0000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Biruk Hailu', '+251911111103', 'biruk@bunacafe.com', 'waiter', 6000, '2024-03-01', 'RMD-BUNA-2024-0003', true),
    ('e0000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'Chaltu Ayana', '+251911111104', 'chaltu@bunacafe.com', 'waiter', 6000, '2024-03-01', 'RMD-BUNA-2024-0004', true),
    ('e0000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', 'Dawit Eshetu', '+251911111105', 'dawit@bunacafe.com', 'cashier', 8000, '2024-03-15', 'RMD-BUNA-2024-0005', true),
    ('e0000001-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', 'Eleni Mesfin', '+251911111106', 'eleni@bunacafe.com', 'manager', 15000, '2024-04-01', 'RMD-BUNA-2024-0006', true);

  -- 9. Create sample orders (for today)
  INSERT INTO orders (id, restaurant_id, table_id, customer_name, status, total_amount, created_at, accepted_at) VALUES
    ('o0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 't0000001-0000-0000-0000-000000000001', 'John Smith', 'completed', 450, now() - interval '2 hours', now() - interval '1.5 hours'),
    ('o0000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 't0000001-0000-0000-0000-000000000002', 'Sarah Johnson', 'ready', 520, now() - interval '1 hour', now() - interval '50 minutes'),
    ('o0000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 't0000001-0000-0000-0000-000000000003', 'Guest', 'preparing', 380, now() - interval '30 minutes', now() - interval '25 minutes'),
    ('o0000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 't0000001-0000-0000-0000-000000000007', 'Guest', 'pending', 780, now() - interval '10 minutes', null),
    ('o0000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', 't0000001-0000-0000-0000-000000000001', 'Mike Brown', 'delivered', 320, now() - interval '3 hours', now() - interval '2.8 hours');

  -- 10. Create order items
  INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal) VALUES
    ('o0000001-0000-0000-0000-000000000001', (SELECT id FROM menu_items WHERE name = 'Doro Wat' LIMIT 1), 1, 250, 250),
    ('o0000001-0000-0000-0000-000000000001', (SELECT id FROM menu_items WHERE name = 'Injera (1kg)' LIMIT 1), 1, 100, 100),
    ('o0000001-0000-0000-0000-000000000001', (SELECT id FROM menu_items WHERE name = 'Ethiopian Coffee' LIMIT 1), 2, 50, 100),
    ('o0000001-0000-0000-0000-000000000002', (SELECT id FROM menu_items WHERE name = 'Kitfo' LIMIT 1), 1, 350, 350),
    ('o0000001-0000-0000-0000-000000000002', (SELECT id FROM menu_items WHERE name = 'Fresh Juice' LIMIT 1), 1, 80, 80),
    ('o0000001-0000-0000-0000-000000000002', (SELECT id FROM menu_items WHERE name = 'Sambusa (Beef)' LIMIT 1), 2, 80, 160),
    ('o0000001-0000-0000-0000-000000000003', (SELECT id FROM menu_items WHERE name = 'Tibs' LIMIT 1), 1, 280, 280),
    ('o0000001-0000-0000-0000-000000000003', (SELECT id FROM menu_items WHERE name = 'Sprite' LIMIT 1), 1, 40, 40),
    ('o0000001-0000-0000-0000-000000000003', (SELECT id FROM menu_items WHERE name = 'Ethiopian Coffee' LIMIT 1), 1, 50, 50),
    ('o0000001-0000-0000-0000-000000000004', (SELECT id FROM menu_items WHERE name = 'Beyaynetu' LIMIT 1), 1, 300, 300),
    ('o0000001-0000-0000-0000-000000000004', (SELECT id FROM menu_items WHERE name = 'Doro Wat' LIMIT 1), 1, 250, 250),
    ('o0000001-0000-0000-0000-000000000004', (SELECT id FROM menu_items WHERE name = 'Tej (Honey Wine)' LIMIT 1), 1, 120, 120);

  -- 11. Seed subscription plan + subscription
  INSERT INTO subscriptions (organization_id, plan_id, status, billing_cycle, current_period_start, current_period_end)
  VALUES ('00000000-0000-0000-0000-000000000001', (SELECT id FROM subscription_plans WHERE name = 'Growth' LIMIT 1), 'active', 'monthly', now(), now() + interval '30 days');

  -- 12. Create sample inventory ingredients
  INSERT INTO ingredients (id, restaurant_id, name, category) VALUES
    ('i0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Berbere Spice', 'dry'),
    ('i0000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Chicken', 'meat'),
    ('i0000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Beef', 'meat'),
    ('i0000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'Injera (Teff Flour)', 'dry'),
    ('i0000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', 'Niter Kibbeh', 'dairy'),
    ('i0000001-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', 'Coffee Beans', 'beverage'),
    ('i0000001-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000002', 'Lentils', 'dry'),
    ('i0000001-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000002', 'Onions', 'produce');

  -- 13. Create stock items
  INSERT INTO stock_items (restaurant_id, ingredient_id, current_quantity, unit_id, reorder_level, reorder_quantity, unit_cost)
  SELECT
    '00000000-0000-0000-0000-000000000002',
    id,
    CASE name
      WHEN 'Berbere Spice' THEN 5
      WHEN 'Chicken' THEN 20
      WHEN 'Beef' THEN 30
      WHEN 'Injera (Teff Flour)' THEN 15
      WHEN 'Niter Kibbeh' THEN 8
      WHEN 'Coffee Beans' THEN 25
      WHEN 'Lentils' THEN 10
      WHEN 'Onions' THEN 40
      ELSE 10
    END,
    (SELECT id FROM units_of_measure LIMIT 1),
    CASE name
      WHEN 'Berbere Spice' THEN 2
      WHEN 'Chicken' THEN 5
      WHEN 'Beef' THEN 10
      WHEN 'Injera (Teff Flour)' THEN 5
      WHEN 'Niter Kibbeh' THEN 2
      WHEN 'Coffee Beans' THEN 10
      WHEN 'Lentils' THEN 3
      WHEN 'Onions' THEN 15
      ELSE 5
    END,
    CASE name
      WHEN 'Berbere Spice' THEN 10
      WHEN 'Chicken' THEN 25
      WHEN 'Beef' THEN 50
      WHEN 'Injera (Teff Flour)' THEN 20
      WHEN 'Niter Kibbeh' THEN 10
      WHEN 'Coffee Beans' THEN 30
      WHEN 'Lentils' THEN 15
      WHEN 'Onions' THEN 50
      ELSE 20
    END,
    CASE name
      WHEN 'Berbere Spice' THEN 150
      WHEN 'Chicken' THEN 220
      WHEN 'Beef' THEN 350
      WHEN 'Injera (Teff Flour)' THEN 80
      WHEN 'Niter Kibbeh' THEN 200
      WHEN 'Coffee Beans' THEN 180
      WHEN 'Lentils' THEN 90
      WHEN 'Onions' THEN 40
      ELSE 100
    END
  FROM ingredients WHERE restaurant_id = '00000000-0000-0000-0000-000000000002';

  -- 14. Create kitchen stations
  INSERT INTO kitchen_stations (id, restaurant_id, name, name_am, name_om) VALUES
    ('k0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Grill Station', 'የጥብስ ቦታ', 'Bakka tibsi'),
    ('k0000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Stew Station', 'የወጥ ቦታ', 'Bakka weettii'),
    ('k0000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Beverage Station', 'የመጠጥ ቦታ', 'Bakka dhugaattii');

  RAISE NOTICE 'Seed data inserted successfully!';
END $$;
