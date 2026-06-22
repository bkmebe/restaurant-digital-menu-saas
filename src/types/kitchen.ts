export type PrepStatus = 'new' | 'preparing' | 'ready' | 'delivered'
export type KitchenRole = 'chef' | 'kitchen_manager'

export interface KitchenStation {
  id: string
  restaurant_id: string
  name: string
  name_am: string | null
  name_om: string | null
  is_active: boolean
}

export interface KitchenStaffMember {
  id: string
  restaurant_id: string
  profile_id: string | null
  full_name: string
  role: KitchenRole
  station_id: string | null
  is_active: boolean
}

export interface KitchenPerformanceLog {
  id: string
  restaurant_id: string
  order_id: string
  chef_id: string | null
  station_id: string | null
  action: string
  duration_seconds: number | null
  created_at: string
}

export interface KDSOrderItem {
  id: string
  menu_item_id: string
  menu_item: { name: string; name_am: string; name_om: string }
  quantity: number
  prep_status: PrepStatus
  station_id: string | null
  prep_started_at: string | null
  prep_completed_at: string | null
  special_requests: string | null
  assigned_chef_id: string | null
}

export interface KDSOrder {
  id: string
  table_id: string
  table: { table_number: number }
  customer_name: string | null
  status: string
  special_instructions: string | null
  priority: number
  created_at: string
  accepted_at: string | null
  preparing_at: string | null
  items: KDSOrderItem[]
}
