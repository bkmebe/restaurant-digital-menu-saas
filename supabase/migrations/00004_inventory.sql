-- Phase 3: Inventory Management

-- Units of measure
CREATE TABLE units_of_measure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  category TEXT DEFAULT 'weight' -- weight, volume, count
);

-- Ingredients / Raw materials
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  name_am TEXT,
  name_om TEXT,
  unit_id UUID REFERENCES units_of_measure(id),
  category TEXT, -- produce, meat, dairy, dry, beverage, etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Recipe/Bill of Materials (links menu_items to ingredients)
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE NOT NULL,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL,
  quantity DECIMAL(10,3) NOT NULL, -- e.g., 0.150 kg of beef
  unit_id UUID REFERENCES units_of_measure(id),
  is_optional BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(menu_item_id, ingredient_id)
);

-- Current stock levels
CREATE TABLE stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_quantity DECIMAL(10,3) DEFAULT 0,
  unit_id UUID REFERENCES units_of_measure(id),
  reorder_level DECIMAL(10,3) DEFAULT 0, -- alert when below this
  reorder_quantity DECIMAL(10,3) DEFAULT 0, -- suggested order qty
  unit_cost DECIMAL(10,2) DEFAULT 0, -- average cost
  location TEXT, -- e.g., "Dry Storage", "Fridge 2"
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Stock movement audit trail
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL,
  quantity DECIMAL(10,3) NOT NULL, -- positive = in, negative = out
  type TEXT NOT NULL, -- purchase, sale, wastage, adjustment, transfer
  reference_type TEXT, -- order_item, purchase_order, wastage
  reference_id UUID,
  unit_cost DECIMAL(10,2),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Suppliers
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  payment_terms TEXT, -- e.g., "Net 30"
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Supplier ingredients (which supplier supplies which ingredients)
CREATE TABLE supplier_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL,
  unit_cost DECIMAL(10,2),
  lead_time_days INTEGER,
  is_preferred BOOLEAN DEFAULT false,
  UNIQUE(supplier_id, ingredient_id)
);

-- Purchase orders
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  order_number TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ordered', 'received', 'cancelled')),
  order_date DATE DEFAULT CURRENT_DATE,
  expected_date DATE,
  received_date DATE,
  total_amount DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL,
  quantity_ordered DECIMAL(10,3) NOT NULL,
  quantity_received DECIMAL(10,3) DEFAULT 0,
  unit_cost DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Wastage records
CREATE TABLE wastage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL,
  quantity DECIMAL(10,3) NOT NULL,
  reason TEXT NOT NULL, -- spoilage, overproduction, theft, expired, other
  notes TEXT,
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Low stock alerts
CREATE TABLE low_stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL,
  current_quantity DECIMAL(10,3),
  reorder_level DECIMAL(10,3),
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ingredients_restaurant ON ingredients(restaurant_id);
CREATE INDEX idx_recipe_ingredients_item ON recipe_ingredients(menu_item_id);
CREATE INDEX idx_stock_items_restaurant ON stock_items(restaurant_id);
CREATE INDEX idx_stock_movements_ingredient ON stock_movements(ingredient_id, created_at);
CREATE INDEX idx_purchase_orders_restaurant ON purchase_orders(restaurant_id, status);
CREATE INDEX idx_low_stock_alerts ON low_stock_alerts(restaurant_id, is_resolved);

-- RLS
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wastage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE low_stock_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies (read for all staff, CRUD for admin/manager)
CREATE POLICY "staff_read_ingredients" ON ingredients FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND restaurant_id = ingredients.restaurant_id)
);
CREATE POLICY "admin_all_ingredients" ON ingredients FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "staff_read_stock" ON stock_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND restaurant_id = stock_items.restaurant_id)
);
CREATE POLICY "admin_all_stock" ON stock_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "staff_read_suppliers" ON suppliers FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND restaurant_id = suppliers.restaurant_id)
);
CREATE POLICY "admin_all_suppliers" ON suppliers FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Auto-deduction trigger function
CREATE OR REPLACE FUNCTION auto_deduct_inventory()
RETURNS TRIGGER AS $$
DECLARE
  rec RECORD;
BEGIN
  -- Only deduct when order is accepted
  IF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    FOR rec IN
      SELECT ri.ingredient_id, ri.quantity * oi.quantity AS total_qty, ri.unit_id
      FROM order_items oi
      JOIN recipe_ingredients ri ON ri.menu_item_id = oi.menu_item_id
      WHERE oi.order_id = NEW.id
    LOOP
      -- Deduct from stock
      UPDATE stock_items
      SET current_quantity = current_quantity - rec.total_qty,
          updated_at = now()
      WHERE ingredient_id = rec.ingredient_id;

      -- Log movement
      INSERT INTO stock_movements (restaurant_id, ingredient_id, quantity, type, reference_type, reference_id)
      VALUES (NEW.restaurant_id, rec.ingredient_id, -rec.total_qty, 'sale', 'order', NEW.id);

      -- Check low stock
      INSERT INTO low_stock_alerts (restaurant_id, ingredient_id, current_quantity, reorder_level)
      SELECT NEW.restaurant_id, si.ingredient_id, si.current_quantity, si.reorder_level
      FROM stock_items si
      WHERE si.ingredient_id = rec.ingredient_id
        AND si.current_quantity <= si.reorder_level
        AND NOT EXISTS (SELECT 1 FROM low_stock_alerts lsa WHERE lsa.ingredient_id = si.ingredient_id AND lsa.is_resolved = false);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_deduct_inventory_trigger
  AFTER UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION auto_deduct_inventory();

-- Function to update average unit cost on purchase receive
CREATE OR REPLACE FUNCTION update_stock_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'received' AND OLD.status != 'received' THEN
    UPDATE stock_items si
    SET current_quantity = si.current_quantity + poi.quantity_received,
        unit_cost = ((si.unit_cost * GREATEST(si.current_quantity, 0)) + (poi.unit_cost * poi.quantity_received))
                    / GREATEST(si.current_quantity + poi.quantity_received, 1),
        updated_at = now()
    FROM purchase_order_items poi
    WHERE poi.purchase_order_id = NEW.id AND poi.ingredient_id = si.ingredient_id;

    INSERT INTO stock_movements (restaurant_id, ingredient_id, quantity, type, reference_type, reference_id, unit_cost)
    SELECT NEW.restaurant_id, poi.ingredient_id, poi.quantity_received, 'purchase', 'purchase_order', NEW.id, poi.unit_cost
    FROM purchase_order_items poi
    WHERE poi.purchase_order_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_stock_on_purchase_trigger
  AFTER UPDATE OF status ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_stock_on_purchase();

-- Seed units of measure
INSERT INTO units_of_measure (name, symbol, category) VALUES
  ('Kilogram', 'kg', 'weight'),
  ('Gram', 'g', 'weight'),
  ('Liter', 'L', 'volume'),
  ('Milliliter', 'mL', 'volume'),
  ('Piece', 'pcs', 'count'),
  ('Dozen', 'dz', 'count'),
  ('Tablespoon', 'tbsp', 'volume'),
  ('Teaspoon', 'tsp', 'volume'),
  ('Cup', 'cup', 'volume');
