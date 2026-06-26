export type Role = 'system_admin' | 'owner' | 'admin' | 'manager' | 'cashier' | 'waiter' | 'kitchen_staff' | 'inventory_manager'

export type TableStatus = 'available' | 'occupied' | 'cleaning'

export type OrderStatus = 'open' | 'preparing' | 'served' | 'paid'

export type ServiceRequestType = 'waiter' | 'bill' | 'other'

export type ServiceRequestStatus = 'pending' | 'acknowledged' | 'resolved'

export type PayrollStatus = 'pending' | 'paid' | 'cancelled'

export type PaymentProvider = 'telebirr' | 'cbe_birr' | 'bank' | 'qr'

export interface Translation {
  en: string
  am: string
  om: string
}

export interface Pagination {
  page: number
  pageSize: number
  total: number
}

export interface ApiResponse<T> {
  data?: T
  error?: { code: string; message: string }
  message?: string
  pagination?: Pagination
}
