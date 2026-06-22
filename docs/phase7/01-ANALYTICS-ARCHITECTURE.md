# Phase 7: Analytics & Business Intelligence

## Metrics & Dashboards

### Admin Dashboard
- **Revenue**: Daily, weekly, monthly, yearly with charts
- **Orders**: Volume trends, peak hours, average order value
- **Menu Performance**: Top items by revenue, quantity, profit margin
- **Staff Performance**: Orders served, tables handled, speed metrics
- **Table Utilization**: Turnover rate, peak times, avg dining duration
- **Inventory**: Stock levels, wastage cost, inventory turnover

### Manager Dashboard
- **Daily Report**: Today's revenue, orders, tips
- **Weekly Report**: Week-over-week comparison, trends
- **Monthly Report**: Month summary, top performers
- **Export**: PDF and Excel reports

### Owner Dashboard
- **Multi-branch comparison**: Revenue, costs, profitability
- **Year-over-year growth**
- **ROI metrics**

## Data Pipeline
```
Orders + Payments → Aggregation Queries → Materialized Views → API → Charts
```

## Materialized Views
```sql
CREATE MATERIALIZED VIEW daily_sales AS
SELECT
  restaurant_id,
  DATE(created_at) as date,
  COUNT(*) as order_count,
  SUM(total_amount) as revenue,
  AVG(total_amount) as avg_order_value
FROM orders
WHERE status = 'paid'
GROUP BY restaurant_id, DATE(created_at);

CREATE MATERIALIZED VIEW menu_item_performance AS
SELECT
  mi.restaurant_id,
  mi.id as menu_item_id,
  mi.name,
  COUNT(oi.id) as order_count,
  SUM(oi.quantity) as total_quantity,
  SUM(oi.subtotal) as total_revenue
FROM menu_items mi
JOIN order_items oi ON oi.menu_item_id = mi.id
JOIN orders o ON o.id = oi.order_id
WHERE o.status = 'paid'
GROUP BY mi.restaurant_id, mi.id, mi.name;
```

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/analytics/revenue | Revenue data |
| GET | /api/analytics/revenue/daily | Daily breakdown |
| GET | /api/analytics/revenue/monthly | Monthly breakdown |
| GET | /api/analytics/menu-performance | Top menu items |
| GET | /api/analytics/staff-performance | Staff metrics |
| GET | /api/analytics/table-utilization | Table metrics |
| GET | /api/analytics/export?type=pdf&range=monthly | Export report |
