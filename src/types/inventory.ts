export interface UnitOfMeasure {
  id: string
  name: string
  symbol: string
  category: string
}

export interface Ingredient {
  id: string
  restaurant_id: string
  name: string
  name_am: string | null
  name_om: string | null
  unit_id: string | null
  category: string | null
  is_active: boolean
  unit?: UnitOfMeasure
}

export interface RecipeIngredient {
  id: string
  restaurant_id: string
  menu_item_id: string
  ingredient_id: string
  quantity: number
  unit_id: string | null
  is_optional: boolean
  ingredient?: Ingredient
}

export interface StockItem {
  id: string
  restaurant_id: string
  ingredient_id: string
  current_quantity: number
  unit_id: string | null
  reorder_level: number
  reorder_quantity: number
  unit_cost: number
  location: string | null
  ingredient?: Ingredient
}

export interface StockMovement {
  id: string
  restaurant_id: string
  ingredient_id: string
  quantity: number
  type: 'purchase' | 'sale' | 'wastage' | 'adjustment' | 'transfer'
  reference_type: string | null
  reference_id: string | null
  unit_cost: number | null
  notes: string | null
  created_by: string | null
  created_at: string
  ingredient?: Ingredient
}

export interface Supplier {
  id: string
  restaurant_id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  payment_terms: string | null
  is_active: boolean
}

export interface PurchaseOrder {
  id: string
  restaurant_id: string
  supplier_id: string | null
  order_number: string
  status: 'draft' | 'ordered' | 'received' | 'cancelled'
  order_date: string
  expected_date: string | null
  received_date: string | null
  total_amount: number
  notes: string | null
  supplier?: Supplier
  items?: PurchaseOrderItem[]
}

export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  ingredient_id: string
  quantity_ordered: number
  quantity_received: number
  unit_cost: number
  subtotal: number
  ingredient?: Ingredient
}

export interface WastageRecord {
  id: string
  restaurant_id: string
  ingredient_id: string
  quantity: number
  reason: string
  notes: string | null
  recorded_by: string | null
  created_at: string
  ingredient?: Ingredient
}

export interface LowStockAlert {
  id: string
  restaurant_id: string
  ingredient_id: string
  current_quantity: number
  reorder_level: number
  is_resolved: boolean
  ingredient?: Ingredient
}
