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
    return NextResponse.json({ data: { branches: [] } })
  }

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, address, phone, created_at')
    .eq('organization_id', orgId)

  const restaurantIds = restaurants?.map(r => r.id) || []

  if (restaurantIds.length === 0) {
    return NextResponse.json({ data: { branches: [] } })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

  const [ordersResult, menuResult, employeesResult, lowStockResult] = await Promise.all([
    supabase.from('orders').select('id, total_amount, status, created_at, restaurant_id').in('restaurant_id', restaurantIds),
    supabase.from('menu_items').select('restaurant_id', { count: 'exact', head: true }).in('restaurant_id', restaurantIds),
    supabase.from('employees').select('restaurant_id', { count: 'exact', head: true }).in('restaurant_id', restaurantIds).eq('is_active', true),
    supabase.from('low_stock_alerts').select('restaurant_id').in('restaurant_id', restaurantIds).eq('is_resolved', false),
  ])

  const allOrders = (ordersResult.data || []) as Array<{ id: string; total_amount: number; status: string; created_at: string; restaurant_id: string }>
  const lowStockData = (lowStockResult.data || []) as Array<{ restaurant_id: string }>

  const branches = (restaurants || []).map(r => {
    const branchOrders = allOrders.filter(o => o.restaurant_id === r.id)
    const totalRevenue = branchOrders.reduce((sum, o) => sum + Number(o.total_amount), 0)
    const monthOrders = branchOrders.filter(o => o.created_at >= monthStart)
    const todayOrders = branchOrders.filter(o => o.created_at >= todayStr)

    return {
      id: r.id,
      name: r.name,
      address: r.address,
      phone: r.phone,
      created_at: r.created_at,
      totalRevenue,
      monthRevenue: monthOrders.reduce((sum, o) => sum + Number(o.total_amount), 0),
      todayRevenue: todayOrders.reduce((sum, o) => sum + Number(o.total_amount), 0),
      totalOrders: branchOrders.length,
      monthOrders: monthOrders.length,
      todayOrders: todayOrders.length,
      avgOrderValue: branchOrders.length > 0 ? totalRevenue / branchOrders.length : 0,
      lowStockCount: lowStockData.filter(l => l.restaurant_id === r.id).length,
    }
  })

  branches.sort((a, b) => b.totalRevenue - a.totalRevenue)

  const totalRevenue = branches.reduce((s, b) => s + b.totalRevenue, 0)
  const totalOrders = branches.reduce((s, b) => s + b.totalOrders, 0)
  const avgAOV = branches.length > 0 ? totalRevenue / totalOrders : 0

  return NextResponse.json({
    data: {
      branches,
      summary: {
        totalBranches: branches.length,
        totalRevenue,
        totalOrders,
        averageOrderValue: avgAOV,
        topBranch: branches[0] || null,
      },
    },
  })
}
