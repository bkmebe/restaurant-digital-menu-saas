-- Phase 2: Kitchen Display System

-- Kitchen roles
CREATE TYPE kitchen_role AS ENUM ('chef', 'kitchen_manager');

-- Kitchen stations (e.g., Grill, Cold, Pastry, Bar)
CREATE TABLE IF NOT EXISTS kitchen_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  name_am TEXT,
  name_om TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Kitchen staff
CREATE TABLE IF NOT EXISTS kitchen_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  role kitchen_role NOT NULL DEFAULT 'chef',
  station_id UUID REFERENCES kitchen_stations(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Order item preparation tracking
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS prep_status TEXT DEFAULT 'new'
  CHECK (prep_status IN ('new', 'preparing', 'ready', 'delivered'));
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES kitchen_stations(id);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS prep_started_at TIMESTAMPTZ;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS prep_completed_at TIMESTAMPTZ;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS assigned_chef_id UUID REFERENCES kitchen_staff(id);

-- Kitchen performance logs
CREATE TABLE IF NOT EXISTS kitchen_performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  chef_id UUID REFERENCES kitchen_staff(id),
  station_id UUID REFERENCES kitchen_stations(id),
  action TEXT NOT NULL, -- accepted, preparing, ready, delivered
  duration_seconds INTEGER, -- time taken for prep
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for KDS queries
CREATE INDEX IF NOT EXISTS idx_order_items_kds ON order_items(order_id, prep_status);
CREATE INDEX IF NOT EXISTS idx_kds_orders ON orders(restaurant_id, status)
  WHERE status IN ('pending', 'accepted', 'preparing', 'ready');

-- RLS for KDS
ALTER TABLE kitchen_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_performance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_read_kitchen_stations" ON kitchen_stations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND restaurant_id = kitchen_stations.restaurant_id)
  );

CREATE POLICY "admin_all_kitchen_stations" ON kitchen_stations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "staff_read_kitchen_staff" ON kitchen_staff
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND restaurant_id = kitchen_staff.restaurant_id)
  );

CREATE POLICY "admin_all_kitchen_staff" ON kitchen_staff
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Function to log kitchen performance
CREATE OR REPLACE FUNCTION log_kitchen_performance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.prep_status = 'preparing' AND OLD.prep_status = 'new' THEN
    INSERT INTO kitchen_performance_logs (restaurant_id, order_id, chef_id, station_id, action, created_at)
    SELECT o.restaurant_id, o.id, NEW.assigned_chef_id, NEW.station_id, 'preparing', now()
    FROM orders o WHERE o.id = NEW.order_id;
  END IF;

  IF NEW.prep_status = 'ready' AND OLD.prep_status = 'preparing' THEN
    INSERT INTO kitchen_performance_logs (restaurant_id, order_id, chef_id, station_id, action, duration_seconds, created_at)
    SELECT o.restaurant_id, o.id, NEW.assigned_chef_id, NEW.station_id, 'ready',
      EXTRACT(EPOCH FROM (now() - NEW.prep_started_at))::INTEGER,
      now()
    FROM orders o WHERE o.id = NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_kitchen_performance_trigger
  AFTER UPDATE OF prep_status ON order_items
  FOR EACH ROW EXECUTE FUNCTION log_kitchen_performance();
