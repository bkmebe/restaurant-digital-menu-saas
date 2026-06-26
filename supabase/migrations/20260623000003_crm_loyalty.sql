-- Phase 10: CRM & Loyalty Management

-- 1. ENUMS
CREATE TYPE loyalty_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');
CREATE TYPE coupon_type AS ENUM ('percentage', 'fixed_amount', 'free_item', 'bogof');
CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'active', 'completed', 'cancelled');
CREATE TYPE campaign_type AS ENUM ('promotion', 'event', 'newsletter', 'loyalty_drive', 'reengagement');
CREATE TYPE points_source AS ENUM ('purchase', 'bonus', 'redemption', 'expiry', 'adjustment');
CREATE TYPE points_reference_type AS ENUM ('order', 'coupon', 'manual');

-- 2. CUSTOMER PROFILES
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  total_visits INTEGER NOT NULL DEFAULT 0,
  total_spent DECIMAL(12,2) NOT NULL DEFAULT 0,
  loyalty_tier loyalty_tier NOT NULL DEFAULT 'bronze',
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, phone),
  UNIQUE (restaurant_id, email)
);

-- 3. REWARD POINTS TRANSACTIONS
CREATE TABLE reward_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  points INTEGER NOT NULL CHECK (points != 0),
  source points_source NOT NULL,
  reference_type points_reference_type NOT NULL DEFAULT 'manual',
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. COUPONS / PROMOTIONS
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type coupon_type NOT NULL,
  value DECIMAL(12,2) NOT NULL CHECK (value > 0),
  min_order_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  max_discount DECIMAL(12,2),
  usage_limit INTEGER CHECK (usage_limit IS NULL OR usage_limit > 0),
  usage_per_customer INTEGER NOT NULL DEFAULT 1 CHECK (usage_per_customer > 0),
  current_uses INTEGER NOT NULL DEFAULT 0 CHECK (current_uses >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  description TEXT,
  applicable_customer_tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, code)
);

-- 5. COUPON REDEMPTIONS
CREATE TABLE coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id UUID,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. VISIT HISTORY
CREATE TABLE visit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id UUID,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_spent DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. MARKETING CAMPAIGNS
CREATE TABLE marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type campaign_type NOT NULL DEFAULT 'promotion',
  status campaign_status NOT NULL DEFAULT 'draft',
  target_customer_tags TEXT[] DEFAULT '{}',
  channel TEXT NOT NULL DEFAULT 'sms' CHECK (channel IN ('sms', 'email', 'both')),
  content TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  sent_count INTEGER NOT NULL DEFAULT 0,
  opened_count INTEGER NOT NULL DEFAULT 0,
  redeemed_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. INDEXES
CREATE INDEX idx_customers_restaurant ON customers(restaurant_id);
CREATE INDEX idx_customers_phone ON customers(restaurant_id, phone);
CREATE INDEX idx_customers_email ON customers(restaurant_id, email);
CREATE INDEX idx_customers_tier ON customers(restaurant_id, loyalty_tier);
CREATE INDEX idx_customers_tags ON customers USING GIN(tags);

CREATE INDEX idx_reward_points_customer ON reward_points(customer_id);
CREATE INDEX idx_reward_points_restaurant ON reward_points(restaurant_id, created_at DESC);

CREATE INDEX idx_coupons_restaurant ON coupons(restaurant_id, is_active);
CREATE INDEX idx_coupons_code ON coupons(restaurant_id, code) WHERE is_active = true;
CREATE INDEX idx_coupons_expires ON coupons(restaurant_id, expires_at) WHERE is_active = true;

CREATE INDEX idx_coupon_redemptions_coupon ON coupon_redemptions(coupon_id);
CREATE INDEX idx_coupon_redemptions_customer ON coupon_redemptions(customer_id);

CREATE INDEX idx_visit_history_customer ON visit_history(customer_id);
CREATE INDEX idx_visit_history_restaurant_date ON visit_history(restaurant_id, visit_date DESC);

CREATE INDEX idx_campaigns_restaurant_status ON marketing_campaigns(restaurant_id, status);
CREATE INDEX idx_campaigns_scheduled ON marketing_campaigns(restaurant_id, scheduled_at)
  WHERE status = 'scheduled';

-- 9. ROW LEVEL SECURITY
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- Customers
CREATE POLICY customers_tenant_isolation ON customers
  FOR ALL USING (restaurant_id = get_current_tenant_id());
CREATE POLICY customers_select_all ON customers
  FOR SELECT USING (true);

-- Reward Points
CREATE POLICY reward_points_tenant_isolation ON reward_points
  FOR ALL USING (EXISTS (
    SELECT 1 FROM customers c WHERE c.id = customer_id AND c.restaurant_id = get_current_tenant_id()
  ));
CREATE POLICY reward_points_select_all ON reward_points
  FOR SELECT USING (true);

-- Coupons
CREATE POLICY coupons_tenant_isolation ON coupons
  FOR ALL USING (restaurant_id = get_current_tenant_id());
CREATE POLICY coupons_select_all ON coupons
  FOR SELECT USING (true);

-- Coupon Redemptions
CREATE POLICY coupon_redemptions_tenant_isolation ON coupon_redemptions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM coupons co WHERE co.id = coupon_id AND co.restaurant_id = get_current_tenant_id()
  ));
CREATE POLICY coupon_redemptions_select_all ON coupon_redemptions
  FOR SELECT USING (true);

-- Visit History
CREATE POLICY visit_history_tenant_isolation ON visit_history
  FOR ALL USING (EXISTS (
    SELECT 1 FROM customers c WHERE c.id = customer_id AND c.restaurant_id = get_current_tenant_id()
  ));
CREATE POLICY visit_history_select_all ON visit_history
  FOR SELECT USING (true);

-- Marketing Campaigns
CREATE POLICY campaigns_tenant_isolation ON marketing_campaigns
  FOR ALL USING (restaurant_id = get_current_tenant_id());
CREATE POLICY campaigns_select_all ON marketing_campaigns
  FOR SELECT USING (true);

-- 10. TRIGGERS
CREATE TRIGGER set_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_campaigns_updated_at
  BEFORE UPDATE ON marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
