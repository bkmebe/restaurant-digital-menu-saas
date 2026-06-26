-- Phase 16.4: Organization-Level Reporting
-- Aggregates data across all branches (restaurants) in an organization

-- Organization daily sales: revenue aggregated by org per day
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_org_daily_sales AS
SELECT
  r.organization_id,
  DATE(o.created_at) as date,
  r.id as restaurant_id,
  COUNT(*) as order_count,
  COUNT(DISTINCT o.table_id) as tables_served,
  SUM(o.total_amount) as revenue,
  AVG(o.total_amount) as avg_order_value
FROM orders o
JOIN restaurants r ON r.id = o.restaurant_id
WHERE o.status IN ('paid', 'completed')
  AND r.organization_id IS NOT NULL
GROUP BY r.organization_id, r.id, DATE(o.created_at)
ORDER BY date DESC;

-- Organization menu performance: top items across all branches
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_org_menu_performance AS
SELECT
  r.organization_id,
  mi.id as menu_item_id,
  mi.name,
  mi.price,
  c.name as category_name,
  COUNT(DISTINCT o.id) as order_count,
  SUM(oi.quantity) as total_quantity,
  SUM(oi.subtotal) as total_revenue
FROM menu_items mi
JOIN restaurants r ON r.id = mi.restaurant_id
LEFT JOIN order_items oi ON oi.menu_item_id = mi.id
LEFT JOIN orders o ON o.id = oi.order_id AND o.status IN ('paid', 'completed')
LEFT JOIN categories c ON c.id = mi.category_id
WHERE r.organization_id IS NOT NULL
GROUP BY r.organization_id, mi.id, mi.name, mi.price, c.name;

-- Organization staff performance
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_org_staff_performance AS
SELECT
  r.organization_id,
  o.restaurant_id,
  o.created_by as profile_id,
  p.full_name,
  p.role,
  COUNT(DISTINCT o.id) as orders_handled,
  SUM(o.total_amount) as revenue_generated,
  AVG(o.total_amount) as avg_order_value
FROM orders o
JOIN restaurants r ON r.id = o.restaurant_id
JOIN profiles p ON p.id = o.created_by
WHERE o.status IN ('paid', 'completed')
  AND r.organization_id IS NOT NULL
GROUP BY r.organization_id, o.restaurant_id, o.created_by, p.full_name, p.role;

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_org_daily_sales
  ON mv_org_daily_sales(organization_id, restaurant_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_org_menu_performance
  ON mv_org_menu_performance(organization_id, menu_item_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_org_staff_performance
  ON mv_org_staff_performance(organization_id, profile_id, restaurant_id);

-- Indexes on base tables for org-level queries
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_date
  ON orders(restaurant_id, created_at DESC)
  WHERE status IN ('paid', 'completed');
CREATE INDEX IF NOT EXISTS idx_payrolls_restaurant_period
  ON payrolls(restaurant_id, month, year);
CREATE INDEX IF NOT EXISTS idx_stock_items_restaurant
  ON stock_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_restaurant_resolved
  ON low_stock_alerts(restaurant_id, is_resolved);

-- Function to refresh org analytics views
CREATE OR REPLACE FUNCTION refresh_org_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_org_daily_sales;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_org_menu_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_org_staff_performance;
END;
$$ LANGUAGE plpgsql;

-- Auto-refresh schedule (commented — enable via pg_cron if available)
-- SELECT cron.schedule('refresh-org-analytics', '0 */2 * * *', 'SELECT refresh_org_analytics();');
