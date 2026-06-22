-- Phase 5: Ethiopian Payment Integration

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('telebirr', 'chapa', 'santimpay', 'cbe_birr', 'cash')),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'ETB',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded')),
  provider_reference TEXT,
  checkout_url TEXT,
  payment_link TEXT,
  phone TEXT,
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  refund_amount DECIMAL(10,2),
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Webhook event log
CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_type TEXT,
  raw_body JSONB,
  headers JSONB,
  signature TEXT,
  is_verified BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_payment_transactions_order ON payment_transactions(order_id);
CREATE INDEX idx_payment_transactions_provider ON payment_transactions(provider, status);
CREATE INDEX idx_payment_webhook_events ON payment_webhook_events(provider, created_at);

-- RLS
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_read_payments" ON payment_transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND restaurant_id = payment_transactions.restaurant_id)
  );

CREATE POLICY "admin_all_payments" ON payment_transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Public can create payment transaction (from table QR)
CREATE POLICY "customer_create_payments" ON payment_transactions
  FOR INSERT WITH CHECK (true);

-- Function to update order on payment completion
CREATE OR REPLACE FUNCTION complete_order_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE orders SET status = 'paid', updated_at = now()
    WHERE id = NEW.order_id AND status != 'paid';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER complete_order_on_payment_trigger
  AFTER UPDATE OF status ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION complete_order_on_payment();
