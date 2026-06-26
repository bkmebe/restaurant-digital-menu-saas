import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole } from '@/lib/utils/tenant'

export async function GET(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'manager')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const { searchParams } = new URL(request.url)
  const range = searchParams.get('range') || 'daily'
  const restaurantId = searchParams.get('restaurantId')

  if (!restaurantId) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'restaurantId required' } }, { status: 400 })
  }

  if (range === 'daily') {
    const { data } = await supabase
      .from('mv_daily_sales')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('date', { ascending: false })
      .limit(30)

    return NextResponse.json({ data: data || [] })
  }

  if (range === 'monthly') {
    const { data } = await supabase
      .from('orders')
      .select('created_at, total_amount')
      .eq('restaurant_id', restaurantId)
      .in('status', ['paid', 'completed'])
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1).toISOString())

    const monthlyData = (data || []).reduce<Record<string, { month: string; revenue: number; count: number }>>((acc, order) => {
      const month = order.created_at.slice(0, 7)
      if (!acc[month]) acc[month] = { month, revenue: 0, count: 0 }
      acc[month].revenue += Number(order.total_amount)
      acc[month].count += 1
      return acc
    }, {})

    return NextResponse.json({ data: Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)) })
  }

  // Menu performance
  if (range === 'menu') {
    const { data } = await supabase
      .from('mv_menu_performance')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('total_revenue', { ascending: false })
      .limit(20)

    return NextResponse.json({ data: data || [] })
  }

  // Staff performance
  if (range === 'staff') {
    const { data } = await supabase
      .from('mv_staff_performance')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('orders_handled', { ascending: false })

    return NextResponse.json({ data: data || [] })
  }

  return NextResponse.json({ error: { code: 'INVALID_RANGE', message: 'Invalid range' } }, { status: 400 })
}
