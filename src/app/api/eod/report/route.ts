import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole } from '@/lib/utils/tenant'

export async function GET(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'manager')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId

  if (!restaurantId) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'No restaurant assigned' } }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const eodId = searchParams.get('id')
  const date = searchParams.get('date')

  let eodData

  if (eodId) {
    const { data } = await supabase
      .from('eod_closings')
      .select('*, eod_closing_items(*), eod_approvals(*)')
      .eq('id', eodId)
      .eq('restaurant_id', restaurantId)
      .single()

    eodData = data
  } else if (date) {
    const { data } = await supabase
      .from('eod_closings')
      .select('*, eod_closing_items(*), eod_approvals(*)')
      .eq('restaurant_id', restaurantId)
      .eq('business_date', date)
      .single()

    eodData = data
  } else {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'Provide id or date parameter' } }, { status: 400 })
  }

  if (!eodData) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'EOD closing not found' } }, { status: 404 })
  }

  // Gather supplementary data for the report
  const today = eodData.business_date

  const [ordersResult, employeesResult, attendanceResult] = await Promise.all([
    supabase
      .from('orders')
      .select('id, table_id, total_amount, payment_method, status, created_at')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', `${today}T00:00:00Z`)
      .lt('created_at', `${today}T23:59:59Z`)
      .in('status', ['paid', 'completed', 'open', 'preparing', 'served'])
      .order('created_at'),
    supabase
      .from('employees')
      .select('id, full_name, role')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true),
    supabase
      .from('staff_attendance')
      .select('*, employees(full_name, role)')
      .eq('restaurant_id', restaurantId)
      .eq('date', today),
  ])

  return NextResponse.json({
    data: eodData,
    report: {
      orders: ordersResult.data || [],
      employees: employeesResult.data || [],
      attendance: attendanceResult.data || [],
      generated_at: new Date().toISOString(),
    },
  })
}
