import { OrderStatus } from './common'

export type OrderStatusV2 =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'completed'
  | 'cancelled'

export interface CartItem {
  menu_item_id: string
  name: string
  name_am: string
  name_om: string
  price: number
  quantity: number
  special_requests: string
  image_url?: string
}

export interface CartState {
  items: CartItem[]
  table_id: string
  restaurant_id: string
  notes: string
}

export interface OrderFormData {
  table_id: string
  customer_name?: string
  special_instructions?: string
  items: {
    menu_item_id: string
    quantity: number
    special_requests?: string
  }[]
}

export interface OrderStatusUpdate {
  status: OrderStatusV2
  cancellation_reason?: string
}

export interface OrderTimeline {
  created_at: string
  accepted_at?: string
  preparing_at?: string
  ready_at?: string
  delivered_at?: string
  completed_at?: string
  cancelled_at?: string
}
