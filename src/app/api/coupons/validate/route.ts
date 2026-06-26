import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole } from '@/lib/utils/tenant'
import { validateCoupon } from '@/lib/utils/crm'

export async function POST(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'waiter')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId

  if (!restaurantId) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'No restaurant assigned' } }, { status: 400 })
  }

  const body = await request.json()
  const { code, customer_id, order_amount } = body

  if (!code || !customer_id || !order_amount) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'Code, customer_id, and order_amount are required' } }, { status: 400 })
  }

  const { data: coupon, error: couponError } = await supabase
    .from('coupons')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('code', code.toUpperCase())
    .single()

  if (couponError || !coupon) {
    return NextResponse.json({ valid: false, reason: 'Coupon not found' })
  }

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customer_id)
    .eq('restaurant_id', restaurantId)
    .single()

  if (customerError || !customer) {
    return NextResponse.json({ valid: false, reason: 'Customer not found' })
  }

  const { data: usageCount } = await supabase
    .from('coupon_redemptions')
    .select('id', { count: 'exact' })
    .eq('coupon_id', coupon.id)
    .eq('customer_id', customer_id)

  const customerUsageCount = usageCount?.length || 0
  if (customerUsageCount >= coupon.usage_per_customer) {
    return NextResponse.json({ valid: false, reason: 'Coupon already used by this customer' })
  }

  const result = validateCoupon(coupon, customer, order_amount)

  return NextResponse.json(result)
}
