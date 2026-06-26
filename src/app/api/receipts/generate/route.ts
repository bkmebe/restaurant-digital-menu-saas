import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole, requireMutate } from '@/lib/utils/tenant'
import { formatReceipt } from '@/lib/utils/receipt'

export async function POST(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'cashier')
  if (roleError) return roleError

  const mutateError = requireMutate(tenant)
  if (mutateError) return mutateError

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId
  const profileId = tenant.userId

  if (!restaurantId) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'No restaurant assigned' } }, { status: 400 })
  }

  const body = await request.json()
  const { order_id, receipt_type } = body as {
    order_id?: string
    receipt_type?: 'thermal_80mm' | 'pdf' | 'qr' | 'email'
  }

  if (!order_id) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'order_id is required' } }, { status: 400 })
  }

  const type = receipt_type || 'thermal_80mm'

  const [orderResult, restaurantResult, numberResult] = await Promise.all([
    supabase
      .from('orders')
      .select('*, items:order_items(*, menu_item:menu_items(name, price)), table:tables(table_number)')
      .eq('id', order_id)
      .eq('restaurant_id', restaurantId)
      .single(),
    supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single(),
    supabase.rpc('next_receipt_number', { p_restaurant_id: restaurantId }),
  ])

  if (orderResult.error || !orderResult.data) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Order not found' } }, { status: 404 })
  }

  const order = orderResult.data
  const restaurant = restaurantResult.data
  const receiptNumber = numberResult.data || `RCP-MANUAL-${Date.now()}`

  const { receipt_data, receipt_text, receipt_html, qr_code_data } = formatReceipt({
    order: order as never,
    restaurant,
    receiptNumber,
    paymentMethod: 'cash',
    paymentReference: null,
  })

  const { data, error } = await supabase
    .from('receipts')
    .insert({
      restaurant_id: restaurantId,
      order_id,
      receipt_type: type,
      receipt_number: receiptNumber,
      receipt_data,
      receipt_text,
      receipt_html,
      status: 'generated',
      qr_code_data,
      generated_by: profileId,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Failed to generate receipt' } }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
