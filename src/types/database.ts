export interface Restaurant {
  id: string
  name: string
  slug: string
  phone: string
  email: string
  address: string
  currency: string
  tax_rate: number
  logo_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  restaurant_id: string
  organization_id: string | null
  role: 'system_admin' | 'owner' | 'admin' | 'manager' | 'cashier' | 'waiter' | 'kitchen_staff' | 'inventory_manager'
  phone: string
  full_name: string
  avatar_url: string | null
  is_mfa_enabled: boolean
  created_at: string
}

export interface Category {
  id: string
  restaurant_id: string
  name: string
  name_am: string
  name_om: string
  icon: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface MenuItem {
  id: string
  restaurant_id: string
  category_id: string
  name: string
  name_am: string
  name_om: string
  description: string
  description_am: string
  description_om: string
  price: number
  image_url: string | null
  is_available: boolean
  is_featured: boolean
  sort_order: number
  created_at: string
  updated_at: string
  category?: Category
}

export interface Table {
  id: string
  restaurant_id: string
  table_number: number
  capacity: number
  status: 'available' | 'occupied' | 'cleaning'
  qr_code_url: string | null
  qr_code_data: string | null
  assigned_waiter_id: string | null
  created_at: string
}

export interface Employee {
  id: string
  restaurant_id: string
  profile_id: string | null
  full_name: string
  phone: string
  email: string
  role: 'system_admin' | 'owner' | 'admin' | 'manager' | 'cashier' | 'waiter' | 'kitchen_staff' | 'inventory_manager'
  national_id: string | null
  national_id_verified: boolean
  digital_employee_id: string
  salary: number
  hire_date: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Payroll {
  id: string
  restaurant_id: string
  employee_id: string
  month: number
  year: number
  salary: number
  bonuses: number
  deductions: number
  net_pay: number
  status: 'pending' | 'paid' | 'cancelled'
  paid_at: string | null
  notes: string | null
  created_at: string
  employee?: Employee
}

export interface Order {
  id: string
  restaurant_id: string
  table_id: string
  customer_name: string | null
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'delivered' | 'completed' | 'cancelled'
  total_amount: number
  special_instructions: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  accepted_at: string | null
  preparing_at: string | null
  ready_at: string | null
  delivered_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  items?: OrderItem[]
  table?: Table
}

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string
  quantity: number
  unit_price: number
  subtotal: number
  notes: string | null
  special_requests: string | null
  created_at: string
  menu_item?: MenuItem
}

export interface ServiceRequest {
  id: string
  restaurant_id: string
  table_id: string
  type: 'waiter' | 'bill' | 'other'
  status: 'pending' | 'acknowledged' | 'resolved'
  notes: string | null
  created_at: string
  resolved_at: string | null
  table?: Table
}

export interface PaymentConfig {
  id: string
  restaurant_id: string
  provider: 'telebirr' | 'cbe_birr' | 'bank' | 'qr'
  label: string
  account_name: string
  account_number: string
  qr_image_url: string | null
  payment_link: string | null
  bank_name: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface AuditLog {
  id: string
  restaurant_id: string
  actor_id: string
  action: string
  table_name: string
  record_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}
