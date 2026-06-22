import type { OrderStatus } from '@/types/common'

export interface TestOrderItem {
  id: string
  menu_item_id: string
  quantity: number
  unit_price: number
  subtotal: number
  special_requests?: string
}

export interface TestOrder {
  id: string
  restaurant_id: string
  table_id: string
  customer_name: string
  status: OrderStatus
  total_amount: number
  created_by?: string
  items: TestOrderItem[]
}

export const ORDER_PENDING: TestOrder = {
  id: 'order-pending-001',
  restaurant_id: 'restaurant-a-uuid',
  table_id: 'table-001',
  customer_name: 'Test Customer',
  status: 'open',
  total_amount: 1500,
  created_by: 'waiter-id',
  items: [
    { id: 'oi-001', menu_item_id: 'mi-001', quantity: 2, unit_price: 500, subtotal: 1000 },
    { id: 'oi-002', menu_item_id: 'mi-002', quantity: 1, unit_price: 500, subtotal: 500 },
  ],
}

export const ORDER_PREPARING: TestOrder = {
  ...ORDER_PENDING,
  id: 'order-preparing-001',
  status: 'preparing',
}

export const ORDER_SERVED: TestOrder = {
  ...ORDER_PENDING,
  id: 'order-served-001',
  status: 'served',
}

export const ORDER_PAID: TestOrder = {
  ...ORDER_PENDING,
  id: 'order-paid-001',
  status: 'paid',
  total_amount: 1500,
}

export const ALL_ORDERS: TestOrder[] = [
  ORDER_PENDING,
  ORDER_PREPARING,
  ORDER_SERVED,
  ORDER_PAID,
]

export const CROSS_TENANT_ORDER: TestOrder = {
  ...ORDER_PENDING,
  id: 'order-cross-tenant',
  restaurant_id: 'restaurant-b-uuid',
  table_id: 'table-999',
}
