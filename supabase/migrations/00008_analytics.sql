-- Phase 7: Analytics & Business Intelligence

-- Materialized view: Daily sales
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_sales AS
SELECT
  restaurant_id,
  DATE(created_at) as date,
  COUNT(*) as order_count,
  COUNT(DISTINCT table_id) as tables_served,
  SUM(total_amount) as revenue,
  AVG(total_amount) as avg_order_value,
  SUM(total_amount) / NULLIF(COUNT(*), 0) as revenue_per_order
FROM orders
WHERE status IN ('paid', 'completed')
GROUP BY restaurant_id, DATE(created_at)
ORDER BY date DESC;

-- Materialized view: Menu item performance
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_menu_performance AS
SELECT
  mi.restaurant_id,
  mi.id as menu_item_id,
  mi.name,
  mi.price,
  c.name as category_name,
  COUNT(DISTINCT o.id) as order_count,
  SUM(oi.quantity) as total_quantity,
  SUM(oi.subtotal) as total_revenue
FROM menu_items mi
LEFT JOIN order_items oi ON oi.menu_item_id = mi.id
LEFT JOIN orders o ON o.id = oi.order_id AND o.status IN ('paid', 'completed')
LEFT JOIN categories c ON c.id = mi.category_id
GROUP BY mi.restaurant_id, mi.id, mi.name, mi.price, c.name;

-- Materialized view: Staff performance
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_staff_performance AS
SELECT
  o.restaurant_id,
  o.created_by as profile_id,
  p.full_name,
  p.role,
  COUNT(DISTINCT o.id) as orders_handled,
  COUNT(DISTINCT o.table_id) as tables_served,
  SUM(o.total_amount) as revenue_generated,
  AVG(o.total_amount) as avg_order_value
FROM orders o
JOIN profiles p ON p.id = o.created_by
WHERE o.status IN ('paid', 'completed')
GROUP BY o.restaurant_id, o.created_by, p.full_name, p.role;

-- Materialized view: Table utilization
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_table_utilization AS
SELECT
  t.restaurant_id,
  t.id as table_id,
  t.table_number,
  t.capacity,
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(DISTINCT DATE(o.created_at)) as active_days,
  AVG(EXTRACT(EPOCH FROM (o.updated_at - o.created_at))/60)::INTEGER as avg_dining_minutes
FROM tables t
LEFT JOIN orders o ON o.table_id = t.id AND o.status IN ('paid', 'completed')
GROUP BY t.restaurant_id, t.id, t.table_number, t.capacity;

-- Indexes on materialized views
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_sales ON mv_daily_sales(restaurant_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_menu_performance ON mv_menu_performance(restaurant_id, menu_item_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_staff_performance ON mv_staff_performance(restaurant_id, profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_table_utilization ON mv_table_utilization(restaurant_id, table_id);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_sales;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_menu_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_staff_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_table_utilization;
END;
$$ LANGUAGE plpgsql;

-- Auto-refresh every hour via pg_cron (enable pg_cron extension)
-- SELECT cron.schedule('refresh-analytics', '0 * * * *', 'SELECT refresh_analytics_views();');
