# Phase 3: Inventory Management — Architecture

## Flow
```
Supplier → Purchase Order → Stock In → Inventory
                                          ↓
Menu Item ← Recipe/BOM ← Ingredients ← Stock Out
  ↓                                        ↓
Order Placed → Auto-deduction        Wastage/Adjustment
```

## Auto-Deduction Logic
When an order item is created with status 'accepted':
1. Look up the menu_item_id in recipe_ingredients
2. For each ingredient, deduct quantity * recipe_quantity from stock
3. Log stock movement
4. Check if any ingredient is below reorder_level → create alert

## Entities
- **ingredients**: Raw materials (e.g., beef, bun, lettuce)
- **units_of_measure**: kg, g, L, mL, pcs, etc.
- **recipe_ingredients**: BOM linking menu_items to ingredients with quantities
- **stock_items**: Current stock levels per ingredient
- **stock_movements**: Audit trail of all stock changes
- **purchase_orders**: Orders to suppliers
- **purchase_order_items**: Line items in purchase orders
- **suppliers**: Vendor management
- **wastage_records**: Spoilage/theft tracking
- **low_stock_alerts**: Automatic alerts

## Auto-deduction Implementation
Using a PostgreSQL trigger function on order_items INSERT:
```sql
CREATE FUNCTION auto_deduct_inventory() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stock_movements (ingredient_id, quantity, type, reference_id)
  SELECT ri.ingredient_id, -(ri.quantity * NEW.quantity), 'sale', NEW.id
  FROM recipe_ingredients ri
  WHERE ri.menu_item_id = NEW.menu_item_id;

  UPDATE stock_items si
  SET current_quantity = si.current_quantity - (ri.quantity * NEW.quantity)
  FROM recipe_ingredients ri
  WHERE ri.menu_item_id = NEW.menu_item_id AND ri.ingredient_id = si.ingredient_id;

  -- Check low stock
  INSERT INTO low_stock_alerts (ingredient_id, current_quantity, reorder_level)
  SELECT si.ingredient_id, si.current_quantity, si.reorder_level
  FROM stock_items si
  JOIN recipe_ingredients ri ON ri.ingredient_id = si.ingredient_id
  WHERE ri.menu_item_id = NEW.menu_item_id
    AND si.current_quantity <= si.reorder_level;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Inventory Valuation
- FIFO (First In, First Out) method
- Track unit cost in purchase orders
- Calculate current inventory value
