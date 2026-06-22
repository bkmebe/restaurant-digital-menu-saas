-- ============================================================
-- STRESS TEST SEED DATA — High-Volume Generation
-- Run AFTER seed-test-data.sql
-- Generates: 10k orders, 50k audit logs, 100+ users
-- ============================================================

DO $$
DECLARE
  rest_a_id UUID := '00000000-0000-0000-0000-000000000010';
  rest_b_id UUID := '00000000-0000-0000-0000-000000000011';

  batch_size INT := 500;
  total_orders INT := 10000;
  total_audit INT := 50000;
  orders_created INT := 0;
  audit_created INT := 0;
  i INT;
  batch_start TIMESTAMPTZ;
  batch_end TIMESTAMPTZ;
  statuses TEXT[] := ARRAY['pending','accepted','preparing','ready','delivered','completed','cancelled'];
  actions TEXT[] := ARRAY['Created order','Updated status','Added item','Modified menu','Processed payment'];
  tables_rest_a UUID[] := ARRAY[
    't0000001-0000-0000-0000-000000000001',
    't0000001-0000-0000-0000-000000000002',
    't0000001-0000-0000-0000-000000000003',
    't0000001-0000-0000-0000-000000000004',
    't0000001-0000-0000-0000-000000000005'
  ];
  item_ids UUID[] := ARRAY[
    'i0000001-0000-0000-0000-000000000001',
    'i0000001-0000-0000-0000-000000000002',
    'i0000001-0000-0000-0000-000000000003',
    'i0000001-0000-0000-0000-000000000004',
    'i0000001-0000-0000-0000-000000000005'
  ];
  rand_table UUID;
  rand_item UUID;
  rand_qty INT;
  rand_status TEXT;
  rand_amount DECIMAL;
  rand_action TEXT;
  order_id UUID;
  day_offset INT;
BEGIN

  -- Disable triggers temporarily for bulk insert speed
  -- (only safe on staging, not production)
  -- ALTER TABLE orders DISABLE TRIGGER ALL;
  -- ALTER TABLE order_items DISABLE TRIGGER ALL;
  -- ALTER TABLE audit_logs DISABLE TRIGGER ALL;

  batch_start := clock_timestamp();

  -- ============================================================
  -- GENERATE 10,000 ORDERS (5k per tenant, mixed statuses)
  -- ============================================================
  FOR i IN 1..total_orders LOOP
    day_offset := (i % 90); -- Span 90 days
    rand_status := statuses[1 + (i % array_length(statuses, 1))];
    rand_amount := round((random() * 5000 + 100)::numeric, 2);
    rand_table := tables_rest_a[1 + (i % array_length(tables_rest_a, 1))];

    IF i % 2 = 0 THEN
      INSERT INTO orders (restaurant_id, table_id, customer_name, status, total_amount, created_at, updated_at)
      VALUES (rest_a_id, rand_table, CASE WHEN i % 3 = 0 THEN 'Guest' ELSE 'Customer ' || i END,
              rand_status, rand_amount,
              NOW() - (day_offset || ' days')::INTERVAL - (i || ' minutes')::INTERVAL,
              NOW() - (day_offset || ' days')::INTERVAL + (i || ' minutes')::INTERVAL)
      RETURNING id INTO order_id;
    ELSE
      INSERT INTO orders (restaurant_id, table_id, customer_name, status, total_amount, created_at, updated_at)
      VALUES (rest_b_id, rand_table, 'Customer ' || i, rand_status, rand_amount,
              NOW() - (day_offset || ' days')::INTERVAL, NOW() - (day_offset || ' days')::INTERVAL)
      RETURNING id INTO order_id;
    END IF;

    -- Add 1-3 order items per order
    FOR j IN 1..(1 + (i % 3)) LOOP
      rand_item := item_ids[1 + ((i + j) % array_length(item_ids, 1))];
      rand_qty := 1 + ((i + j) % 4);
      INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal)
      VALUES (order_id, rand_item, rand_qty, rand_amount / rand_qty, rand_amount);
    END LOOP;

    orders_created := orders_created + 1;

    -- Commit in batches
    IF i % batch_size = 0 THEN
      batch_end := clock_timestamp();
      RAISE NOTICE 'Orders created: %/%, Time: %s', orders_created, total_orders,
                   EXTRACT(SECOND FROM (batch_end - batch_start));
      COMMIT;
    END IF;
  END LOOP;

  -- ============================================================
  -- GENERATE 50,000 AUDIT LOGS
  -- ============================================================
  FOR i IN 1..total_audit LOOP
    rand_action := actions[1 + (i % array_length(actions, 1))];
    INSERT INTO audit_logs (restaurant_id, actor_id, action, table_name, created_at)
    VALUES (
      CASE WHEN i % 2 = 0 THEN rest_a_id ELSE rest_b_id END,
      '00000000-0000-0000-0000-000000000001',
      rand_action || ' #' || i,
      CASE i % 5
        WHEN 0 THEN 'orders' WHEN 1 THEN 'menu_items'
        WHEN 2 THEN 'employees' WHEN 3 THEN 'tables'
        ELSE 'payrolls'
      END,
      NOW() - ((i % 90) || ' days')::INTERVAL
    );
    audit_created := audit_created + 1;

    IF i % batch_size = 0 THEN
      RAISE NOTICE 'Audit logs created: %/%', audit_created, total_audit;
      COMMIT;
    END IF;
  END LOOP;

  -- Re-enable triggers
  -- ALTER TABLE orders ENABLE TRIGGER ALL;
  -- ALTER TABLE order_items ENABLE TRIGGER ALL;
  -- ALTER TABLE audit_logs ENABLE TRIGGER ALL;

  batch_end := clock_timestamp();
  RAISE NOTICE '=== STRESS SEED COMPLETE ===';
  RAISE NOTICE 'Total Orders: %', orders_created;
  RAISE NOTICE 'Total Audit Logs: %', audit_created;
  RAISE NOTICE 'Total Time: %s', EXTRACT(SECOND FROM (batch_end - batch_start));
END $$;
