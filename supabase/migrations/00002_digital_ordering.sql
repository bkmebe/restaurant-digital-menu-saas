-- Phase 1: Digital Ordering System
-- Extended order statuses for full lifecycle
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'accepted';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'preparing';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'ready';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'delivered';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cancelled';

-- Add new columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS special_instructions TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_prep_time INTEGER; -- minutes
ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS preparing_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0; -- 0=normal, 1=high, 2=urgent

-- Add notes to order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS special_requests TEXT;

-- Split transaction: index references newly-added enum values
COMMIT;

CREATE INDEX IF NOT EXISTS idx_orders_kitchen ON orders(restaurant_id, status, created_at)
  WHERE status IN ('pending', 'accepted', 'preparing', 'ready');

BEGIN;

-- Realtime publication for order tracking
DROP PUBLICATION IF EXISTS order_tracking;
CREATE PUBLICATION order_tracking FOR TABLE orders, order_items;

-- Enable realtime for orders and order_items
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE order_items REPLICA IDENTITY FULL;

-- RLS: customers can create orders for their table
CREATE POLICY "customer_create_orders" ON orders
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM tables WHERE id = table_id)
  );

CREATE POLICY "customer_read_own_orders" ON orders
  FOR SELECT USING (
    table_id IN (SELECT id FROM tables)
  );

-- Function to calculate estimated prep time
CREATE OR REPLACE FUNCTION calculate_prep_time(order_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_minutes INTEGER;
BEGIN
  SELECT COALESCE(MAX(mi.estimated_prep_time), 15) INTO total_minutes
  FROM order_items oi
  JOIN menu_items mi ON mi.id = oi.menu_item_id
  WHERE oi.order_id = calculate_prep_time.order_id;
  RETURN total_minutes;
END;
$$ LANGUAGE plpgsql;
