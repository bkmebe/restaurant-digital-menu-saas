import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole } from '@/lib/utils/tenant'

export async function GET() {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'owner')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const orgId = tenant.organizationId

  if (!orgId) {
    return NextResponse.json({ data: null })
  }

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id')
    .eq('organization_id', orgId)

  const restaurantIds = restaurants?.map(r => r.id) || []

  if (restaurantIds.length === 0) {
    return NextResponse.json({
      data: {
        totalRevenue: 0, revenueToday: 0, revenueMonth: 0,
        totalOrders: 0, ordersToday: 0, ordersMonth: 0,
        activeEmployees: 0, menuItemCount: 0, lowStockCount: 0,
        branchCount: 0, averageOrderValue: 0,
        revenueGrowth: 0, orderGrowth: 0,
      },
    })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59)

  const [ordersResult, menuResult, employeesResult, lowStockResult, ingredientsResult] = await Promise.all([
    supabase.from('orders').select('id, total_amount, status, created_at').in('restaurant_id', restaurantIds),
    supabase.from('menu_items').select('id', { count: 'exact', head: true }).in('restaurant_id', restaurantIds),
    supabase.from('employees').select('id', { count: 'exact', head: true }).in('restaurant_id', restaurantIds).eq('is_active', true),
    supabase.from('low_stock_alerts').select('id', { count: 'exact', head: true }).in('restaurant_id', restaurantIds).eq('is_resolved', false),
    supabase.from('ingredients').select('quantity, unit_cost').in('restaurant_id', restaurantIds),
  ])

  const orders = (ordersResult.data || []) as Array<{ total_amount: number; created_at: string }>
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0)
  const todayOrders = orders.filter(o => o.created_at >= todayStr)
  const monthOrders = orders.filter(o => o.created_at >= monthStart)
  const revenueToday = todayOrders.reduce((sum, o) => sum + Number(o.total_amount), 0)
  const revenueMonth = monthOrders.reduce((sum, o) => sum + Number(o.total_amount), 0)
  const totalOrders = orders.length
  const ordersToday = todayOrders.length
  const ordersMonth = monthOrders.length

  const lastMonthOrders = orders.filter(o => {
    const d = new Date(o.created_at)
    return d >= lastMonthStart && d <= lastMonthEnd
  })
  const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => sum + Number(o.total_amount), 0)
  const revenueGrowth = lastMonthRevenue > 0 ? ((revenueMonth - lastMonthRevenue) / lastMonthRevenue) * 100 : 0
  const orderGrowth = lastMonthOrders.length > 0 ? ((ordersMonth - lastMonthOrders.length) / lastMonthOrders.length) * 100 : 0

  const ingredients = (ingredientsResult.data || []) as Array<{ quantity: number; unit_cost: number }>
  const totalInventoryValue = ingredients.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unit_cost)), 0)

  return NextResponse.json({
    data: {
      totalRevenue,
      revenueToday,
      revenueMonth,
      totalOrders,
      ordersToday,
      ordersMonth,
      activeEmployees: employeesResult.count || 0,
      menuItemCount: menuResult.count || 0,
      lowStockCount: lowStockResult.count || 0,
      branchCount: restaurantIds.length,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      totalInventoryValue,
      revenueGrowth: Math.round(revenueGrowth * 100) / 100,
      orderGrowth: Math.round(orderGrowth * 100) / 100,
    },
  })
}
