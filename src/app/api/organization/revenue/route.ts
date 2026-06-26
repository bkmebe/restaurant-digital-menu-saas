import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole } from '@/lib/utils/tenant'

export async function GET(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'owner')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const orgId = tenant.organizationId

  if (!orgId) {
    return NextResponse.json({ data: { trends: [], summary: null } })
  }

  const { searchParams } = new URL(request.url)
  const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30'), 1), 365)

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id')
    .eq('organization_id', orgId)

  const restaurantIds = restaurants?.map(r => r.id) || []

  if (restaurantIds.length === 0) {
    return NextResponse.json({ data: { trends: [], summary: null } })
  }

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  const cutoffStr = cutoffDate.toISOString()

  const { data: dailySales } = await supabase
    .from('mv_daily_sales')
    .select('*')
    .in('restaurant_id', restaurantIds)
    .gte('date', cutoffStr.split('T')[0])
    .order('date', { ascending: true })

  const allOrders = (dailySales || []) as Array<{ date: string; revenue: number; order_count: number }>

  const trends = allOrders.map(d => ({
    date: d.date,
    revenue: d.revenue || 0,
    orders: d.order_count || 0,
  }))

  const totalRevenue = trends.reduce((s, t) => s + t.revenue, 0)
  const totalOrders = trends.reduce((s, t) => s + t.orders, 0)

  const mid = Math.floor(trends.length / 2)
  const firstHalf = trends.slice(0, mid)
  const secondHalf = trends.slice(mid)
  const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((s, t) => s + t.revenue, 0) / firstHalf.length : 0
  const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((s, t) => s + t.revenue, 0) / secondHalf.length : 0
  const trend = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0

  return NextResponse.json({
    data: {
      trends,
      summary: {
        days,
        totalRevenue,
        totalOrders,
        averageDailyRevenue: trends.length > 0 ? totalRevenue / trends.length : 0,
        trend: Math.round(trend * 100) / 100,
        peakDay: trends.length > 0 ? trends.reduce((max, t) => t.revenue > max.revenue ? t : max, trends[0]!) : null,
      },
    },
  })
}
