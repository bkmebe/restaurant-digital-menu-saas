import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole, requireMutate } from '@/lib/utils/tenant'

export async function POST(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'manager')
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
  const { actual_cash, notes, items } = body as {
    actual_cash?: number
    notes?: string
    items?: { payment_method: string; expected_amount: number; actual_amount: number }[]
  }

  const today = new Date().toISOString().slice(0, 10)

  // Get current EOD
  const { data: closing } = await supabase
    .from('eod_closings')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('business_date', today)
    .single()

  if (!closing) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'No open EOD found. Open EOD first.' } }, { status: 404 })
  }

  if (closing.status !== 'open') {
    return NextResponse.json({ error: { code: 'INVALID_STATUS', message: `Cannot close EOD with status: ${closing.status}` } }, { status: 409 })
  }

  // Get sales summary for today
  const orderData = await supabase
    .from('orders')
    .select('total_amount, payment_method')
    .eq('restaurant_id', restaurantId)
    .gte('created_at', `${today}T00:00:00Z`)
    .lt('created_at', `${today}T23:59:59Z`)
    .in('status', ['paid', 'completed'])

  const orders = orderData.data || []
  const totalOrders = orders.length
  const totalSales = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
  const cashSales = orders.filter(o => o.payment_method === 'cash').reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
  const cardSales = orders.filter(o => ['bank', 'qr'].includes(o.payment_method || '')).reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
  const mobileSales = orders.filter(o => o.payment_method === 'telebirr' || o.payment_method === 'cbe_birr').reduce((sum, o) => sum + Number(o.total_amount || 0), 0)

  const expectedCash = actual_cash !== undefined ? cashSales : 0
  const actualCash = actual_cash ?? cashSales
  const discrepancy = actualCash - expectedCash
  const closedAt = new Date().toISOString()

  // Update the closing record
  const { error: updateError } = await supabase
    .from('eod_closings')
    .update({
      status: 'closed',
      closed_at: closedAt,
      total_orders: totalOrders,
      total_sales: totalSales,
      cash_sales: cashSales,
      card_sales: cardSales,
      mobile_money_sales: mobileSales,
      expected_cash: expectedCash,
      actual_cash: actualCash,
      discrepancy_amount: discrepancy,
      notes: notes || null,
      closed_by: profileId,
    })
    .eq('id', closing.id)

  if (updateError) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Failed to close EOD' } }, { status: 500 })
  }

  // Insert closing items if provided
  if (items && items.length > 0) {
    const closingItems = items.map(item => ({
      eod_closing_id: closing.id,
      payment_method: item.payment_method,
      expected_amount: item.expected_amount,
      actual_amount: item.actual_amount,
      difference: item.actual_amount - item.expected_amount,
    }))

    await supabase.from('eod_closing_items').insert(closingItems)
  }

  // Fetch the updated record
  const { data: updated } = await supabase
    .from('eod_closings')
    .select('*, eod_closing_items(*)')
    .eq('id', closing.id)
    .single()

  return NextResponse.json({ data: updated }, { status: 200 })
}
