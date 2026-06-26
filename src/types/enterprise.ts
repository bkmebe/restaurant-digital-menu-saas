// Enterprise feature types for RestaurantOS expansion
// Phase 1: Foundation — type definitions for future phases

export type EODStatus = 'pending' | 'waiter_submitted' | 'cashier_verified' | 'manager_approved' | 'approved'

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'overtime'
export type AttendanceAction = 'clock_in' | 'clock_out' | 'break_start' | 'break_end'

export type TipType = 'cash' | 'mobile' | 'manual'
export type TipStatus = 'pending' | 'confirmed' | 'paid_out'

export type ShiftType = 'morning' | 'afternoon' | 'evening' | 'full_day'
export type ShiftStatus = 'scheduled' | 'active' | 'completed' | 'cancelled' | 'missed'

export type PaymentVerificationMethod = 'receipt_upload' | 'reference_check' | 'api_verification'
export type PaymentVerificationStatus = 'pending' | 'verified' | 'rejected' | 'disputed'
export type PaymentProvider = 'telebirr' | 'cbe_birr' | 'santimpay' | 'chapa'

export type ReceiptType = 'thermal_80mm' | 'pdf' | 'qr' | 'email'
export type BackupType = 'daily' | 'manual' | 'on_demand'
export type BackupStatus = 'in_progress' | 'completed' | 'failed'
export type ForecastRisk = 'low' | 'medium' | 'high' | 'critical'
export type ReorderUrgency = 'normal' | 'soon' | 'critical' | 'overdue'

export interface StaffAttendance {
  id: string
  restaurant_id: string
  employee_id: string
  date: string
  clock_in: string | null
  clock_out: string | null
  total_break_minutes: number
  status: AttendanceStatus
  late_minutes: number
  overtime_minutes: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AttendanceLog {
  id: string
  restaurant_id: string
  employee_id: string
  action: AttendanceAction
  timestamp: string
  ip_address: string | null
  device_info: string | null
  created_at: string
}

export interface CashReconciliation {
  id: string
  restaurant_id: string
  date: string
  waiter_id: string | null
  cashier_id: string | null
  waiter_cash_sales: number
  waiter_mobile_sales: number
  waiter_tips: number
  waiter_submitted_at: string | null
  waiter_notes: string | null
  cashier_cash_total: number
  cashier_mobile_total: number
  cashier_discrepancy: number
  cashier_verified_at: string | null
  cashier_notes: string | null
  status: EODStatus
  inventory_manager_id: string | null
  approved_at: string | null
  final_sales_total: number
  created_at: string
  updated_at: string
}

export interface DailySalesReport {
  id: string
  restaurant_id: string
  date: string
  reconciliation_id: string | null
  total_orders: number
  total_sales: number
  total_tips: number
  total_tax: number
  cash_sales: number
  mobile_sales: number
  order_count_by_hour: Record<string, number>
  peak_hour: string | null
  average_order_value: number
  notes: string | null
  created_at: string
}

export type DistributionMethod = 'equal_split' | 'hours_worked' | 'role_weighted' | 'sales_contribution'
export type PoolStatus = 'open' | 'closed' | 'distributed'

export interface StaffTip {
  id: string
  restaurant_id: string
  employee_id: string
  order_id: string | null
  tip_pool_id: string | null
  tip_type: TipType
  amount: number
  currency: string
  payment_reference: string | null
  status: TipStatus
  confirmed_by: string | null
  confirmed_at: string | null
  paid_out_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TipPool {
  id: string
  restaurant_id: string
  name: string
  description: string | null
  pool_period_start: string
  pool_period_end: string
  total_collected: number
  total_distributed: number
  distribution_method: DistributionMethod
  status: PoolStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TipDistribution {
  id: string
  restaurant_id: string
  tip_pool_id: string
  employee_id: string
  weight: number
  amount: number
  is_paid: boolean
  paid_at: string | null
  paid_by: string | null
  notes: string | null
  created_at: string
}

export interface PaymentVerification {
  id: string
  restaurant_id: string
  order_id: string | null
  payment_config_id: string | null
  provider: PaymentProvider
  verification_method: PaymentVerificationMethod
  verification_reference: string | null
  receipt_image_url: string | null
  amount: number
  currency: string
  status: PaymentVerificationStatus
  verified_by: string | null
  verified_at: string | null
  verified_notes: string | null
  external_verification_id: string | null
  external_verification_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface FaydaVerification {
  id: string
  restaurant_id: string
  employee_id: string
  fayda_number: string
  full_name: string | null
  phone: string | null
  date_of_birth: string | null
  verification_status: string
  transaction_id: string | null
  verification_response: Record<string, unknown> | null
  verified_by: string | null
  verified_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface Shift {
  id: string
  restaurant_id: string
  employee_id: string
  shift_date: string
  shift_type: ShiftType
  start_time: string
  end_time: string
  actual_start: string | null
  actual_end: string | null
  status: ShiftStatus
  break_duration_minutes: number
  overtime_minutes: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ShiftReport {
  id: string
  restaurant_id: string
  shift_id: string
  total_orders_handled: number
  total_revenue: number
  total_tips: number
  incidents_reported: number
  opened_by: string | null
  opened_at: string | null
  closed_by: string | null
  closed_at: string | null
  notes: string | null
  created_at: string
}

export interface Receipt {
  id: string
  restaurant_id: string
  order_id: string
  receipt_type: ReceiptType
  receipt_number: string
  receipt_data: Record<string, unknown> | null
  receipt_text: string | null
  receipt_html: string | null
  status: string
  sent_to: string | null
  sent_at: string | null
  qr_code_data: string | null
  qr_code_url: string | null
  generated_by: string | null
  created_at: string
}

export interface BackupRecord {
  id: string
  organization_id: string | null
  restaurant_id: string | null
  backup_type: BackupType
  status: BackupStatus
  size_bytes: number | null
  file_url: string | null
  checksum: string | null
  started_at: string
  completed_at: string | null
  expires_at: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show'

export type WaitlistStatus = 'waiting' | 'notified' | 'seated' | 'cancelled'

export type NotificationChannel = 'sms' | 'email'

export interface Reservation {
  id: string
  restaurant_id: string
  customer_name: string
  customer_phone: string | null
  customer_email: string | null
  guest_count: number
  reservation_date: string
  reservation_time: string
  duration_minutes: number
  status: ReservationStatus
  special_requests: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  tables?: { id: string; table_number: number }[]
}

export interface ReservationTable {
  id: string
  reservation_id: string
  table_id: string
}

export interface WaitlistEntry {
  id: string
  restaurant_id: string
  customer_name: string
  customer_phone: string | null
  customer_email: string | null
  guest_count: number
  status: WaitlistStatus
  notified_at: string | null
  notes: string | null
  created_at: string
}

export interface ReservationNotification {
  id: string
  reservation_id: string
  type: 'confirmation' | 'reminder' | 'cancellation' | 'status_update'
  channel: NotificationChannel
  recipient: string
  sent_at: string
  status: 'sent' | 'failed'
  error_message: string | null
}

// ── CRM & Loyalty Types ──────────────────────────────────────────

export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum'

export type CouponType = 'percentage' | 'fixed_amount' | 'free_item' | 'bogof'

export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled'

export type CampaignType = 'promotion' | 'event' | 'newsletter' | 'loyalty_drive' | 'reengagement'

export type PointsSource = 'purchase' | 'bonus' | 'redemption' | 'expiry' | 'adjustment'

export type PointsReferenceType = 'order' | 'coupon' | 'manual'

export interface CustomerProfile {
  id: string
  restaurant_id: string
  name: string
  phone: string | null
  email: string | null
  total_visits: number
  total_spent: number
  loyalty_tier: LoyaltyTier
  notes: string | null
  tags: string[]
  created_at: string
  updated_at: string
  points_balance?: number
}

export interface RewardPointsTransaction {
  id: string
  restaurant_id: string
  customer_id: string
  points: number
  source: PointsSource
  reference_type: PointsReferenceType
  reference_id: string | null
  description: string | null
  created_at: string
}

export interface Coupon {
  id: string
  restaurant_id: string
  code: string
  type: CouponType
  value: number
  min_order_amount: number
  max_discount: number | null
  usage_limit: number | null
  usage_per_customer: number
  current_uses: number
  is_active: boolean
  starts_at: string
  expires_at: string | null
  description: string | null
  applicable_customer_tags: string[] | null
  created_at: string
  updated_at: string
}

export interface CouponRedemption {
  id: string
  coupon_id: string
  customer_id: string
  order_id: string | null
  discount_amount: number
  redeemed_at: string
}

export interface VisitHistoryEntry {
  id: string
  restaurant_id: string
  customer_id: string
  order_id: string | null
  visit_date: string
  amount_spent: number
  notes: string | null
  created_at: string
}

export interface MarketingCampaign {
  id: string
  restaurant_id: string
  name: string
  type: CampaignType
  status: CampaignStatus
  target_customer_tags: string[]
  channel: 'sms' | 'email' | 'both'
  content: string
  scheduled_at: string | null
  sent_at: string | null
  sent_count: number
  opened_count: number
  redeemed_count: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface InventoryForecast {
  id: string
  restaurant_id: string
  ingredient_id: string
  forecast_date: string
  predicted_quantity: number
  confidence_score: number | null
  reorder_recommended: boolean
  recommended_order_quantity: number | null
  recommended_supplier_id: string | null
  daily_usage_rate: number | null
  lead_time_days: number | null
  stockout_risk: ForecastRisk
  model_version: string | null
  created_at: string
  ingredient?: { name: string; unit: string; category?: string } | null
  recommended_supplier?: { name: string } | null
}

export interface ReorderSuggestion {
  id: string
  restaurant_id: string
  ingredient_id: string
  current_stock: number
  reorder_level: number
  suggested_order_qty: number
  daily_usage_rate: number
  days_until_stockout: number
  lead_time_days: number
  urgency: ReorderUrgency
  preferred_supplier_id: string | null
  estimated_cost: number | null
  is_actioned: boolean
  actioned_at: string | null
  actioned_by: string | null
  created_at: string
  updated_at: string
  ingredient?: { name: string; unit: string; category?: string } | null
  preferred_supplier?: { id: string; name: string } | null
}
