-- ============================================
-- Phase 9: Reservations & Waitlist Management
-- ============================================

-- --------------------------------------------
-- 1. ENUMS
-- --------------------------------------------
CREATE TYPE reservation_status AS ENUM (
  'pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'
);

CREATE TYPE waitlist_status AS ENUM (
  'waiting', 'notified', 'seated', 'cancelled'
);

CREATE TYPE notification_channel AS ENUM (
  'sms', 'email'
);

-- --------------------------------------------
-- 2. RESERVATIONS TABLE
-- --------------------------------------------
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  guest_count INTEGER NOT NULL CHECK (guest_count > 0),
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 90 CHECK (duration_minutes > 0),
  status reservation_status NOT NULL DEFAULT 'pending',
  special_requests TEXT,
  notes TEXT,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reservation <-> Table junction
CREATE TABLE reservation_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  UNIQUE (reservation_id, table_id)
);

-- --------------------------------------------
-- 3. WAITLIST TABLE
-- --------------------------------------------
CREATE TABLE waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  guest_count INTEGER NOT NULL CHECK (guest_count > 0),
  status waitlist_status NOT NULL DEFAULT 'waiting',
  notified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------
-- 4. NOTIFICATION LOG
-- --------------------------------------------
CREATE TABLE reservation_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('confirmation', 'reminder', 'cancellation', 'status_update')),
  channel notification_channel NOT NULL,
  recipient TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error_message TEXT
);

-- --------------------------------------------
-- 5. INDEXES
-- --------------------------------------------
CREATE INDEX idx_reservations_restaurant_date ON reservations(restaurant_id, reservation_date);
CREATE INDEX idx_reservations_status ON reservations(restaurant_id, status);
CREATE INDEX idx_reservations_customer_phone ON reservations(restaurant_id, customer_phone);
CREATE INDEX idx_reservation_tables_table ON reservation_tables(table_id);
CREATE INDEX idx_reservation_tables_reservation ON reservation_tables(reservation_id);
CREATE INDEX idx_waitlist_restaurant_status ON waitlist_entries(restaurant_id, status);

-- --------------------------------------------
-- 6. ROW LEVEL SECURITY
-- --------------------------------------------
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_notifications ENABLE ROW LEVEL SECURITY;

-- Reservations: staff can manage own restaurant
CREATE POLICY reservations_tenant_isolation ON reservations
  FOR ALL USING (restaurant_id = get_current_tenant_id());

CREATE POLICY reservations_select_all ON reservations
  FOR SELECT USING (true);

-- Reservation tables
CREATE POLICY reservation_tables_tenant_isolation ON reservation_tables
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM reservations r
      WHERE r.id = reservation_id
        AND r.restaurant_id = get_current_tenant_id()
    )
  );

CREATE POLICY reservation_tables_select_all ON reservation_tables
  FOR SELECT USING (true);

-- Waitlist: staff can manage own restaurant
CREATE POLICY waitlist_tenant_isolation ON waitlist_entries
  FOR ALL USING (restaurant_id = get_current_tenant_id());

CREATE POLICY waitlist_select_all ON waitlist_entries
  FOR SELECT USING (true);

-- Notifications: staff view own restaurant
CREATE POLICY reservation_notifications_tenant_isolation ON reservation_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM reservations r
      WHERE r.id = reservation_id
        AND r.restaurant_id = get_current_tenant_id()
    )
  );

CREATE POLICY reservation_notifications_select_all ON reservation_notifications
  FOR SELECT USING (true);

-- --------------------------------------------
-- 7. TRIGGER: updated_at
-- --------------------------------------------
CREATE TRIGGER set_reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
