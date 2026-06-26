import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole } from '@/lib/utils/tenant'

export async function GET(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'admin')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const orgId = tenant.organizationId

  const { searchParams } = new URL(request.url)
  const filterBranchId = searchParams.get('branchId')

  if (!orgId) {
    return NextResponse.json({ data: { overview: {}, branches: [], revenue_trends: [], popular_items: [], payroll_summary: null, inventory_summary: null, growth_metrics: {} } })
  }

  let query = supabase.from('restaurants').select('id, name').eq('organization_id', orgId)
  if (filterBranchId) {
    query = query.eq('id', filterBranchId)
  }
  const { data: restaurants } = await query

  const restaurantIds = restaurants?.map(r => r.id) || []
  const branchList = restaurants?.map(r => ({ id: r.id, name: r.name })) || []

  if (restaurantIds.length === 0) {
    return NextResponse.json({
      data: {
        overview: { totalRevenue: 0, revenueToday: 0, revenueMonth: 0, totalOrders: 0, ordersToday: 0, ordersMonth: 0, activeEmployees: 0, menuItemCount: 0, lowStockCount: 0, branchCount: 0, averageOrderValue: 0 },
        branches: [], revenue_trends: [], popular_items: [], payroll_summary: null, inventory_summary: null, growth_metrics: { revenueGrowth: 0, orderGrowth: 0 },
      },
    })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString()
  const curMonth = today.getMonth()
  const curYear = today.getFullYear()
  const monthStart = new Date(curYear, curMonth, 1).toISOString()

  const lastMonthStart = new Date(curYear, curMonth - 1, 1)
  const lastMonthEnd = new Date(curYear, curMonth, 0, 23, 59, 59)

  const [ordersResult, menuResult, payrollResult, dailySalesResult, menuPerfResult, employeesResult, lowStockResult, ingredientsResult] = await Promise.all([
    supabase.from('orders').select('id, total_amount, status, created_at, restaurant_id').in('restaurant_id', restaurantIds),
    supabase.from('menu_items').select('id', { count: 'exact', head: true }).in('restaurant_id', restaurantIds),
    supabase.from('payrolls').select('salary, bonuses, deductions, net_pay, status, employee_id, restaurant_id').in('restaurant_id', restaurantIds).eq('month', curMonth + 1).eq('year', curYear),
    supabase.from('mv_daily_sales').select('*').in('restaurant_id', restaurantIds).order('date', { ascending: false }).limit(60),
    supabase.from('mv_menu_performance').select('*').in('restaurant_id', restaurantIds).order('total_quantity', { ascending: false }).limit(20),
    supabase.from('employees').select('id', { count: 'exact', head: true }).in('restaurant_id', restaurantIds).eq('is_active', true),
    supabase.from('low_stock_alerts').select('id, restaurant_id').in('restaurant_id', restaurantIds).eq('is_resolved', false),
    supabase.from('ingredients').select('id, quantity, unit_cost, restaurant_id').in('restaurant_id', restaurantIds),
  ])

  const orders = (ordersResult.data || []) as Array<{ id: string; total_amount: number; status: string; created_at: string; restaurant_id: string }>
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0)
  const todayOrders = orders.filter(o => o.created_at >= todayStr)
  const monthOrders = orders.filter(o => o.created_at >= monthStart)

  const revenueToday = todayOrders.reduce((sum, o) => sum + Number(o.total_amount), 0)
  const revenueMonth = monthOrders.reduce((sum, o) => sum + Number(o.total_amount), 0)
  const totalOrders = orders.length
  const ordersToday = todayOrders.length
  const ordersMonth = monthOrders.length
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  const activeEmployees = employeesResult.count || 0
  const menuItemCount = menuResult.count || 0
  const lowStockCount = (lowStockResult.data || []).length

  const payrollData = (payrollResult.data || []) as Array<{ salary: number; bonuses: number; deductions: number; net_pay: number; status: string; employee_id: string }>
  const payrollSummary = payrollData.length > 0 ? {
    totalSalary: payrollData.reduce((s, p) => s + Number(p.salary), 0),
    totalBonuses: payrollData.reduce((s, p) => s + Number(p.bonuses), 0),
    totalDeductions: payrollData.reduce((s, p) => s + Number(p.deductions), 0),
    netPay: payrollData.reduce((s, p) => s + Number(p.net_pay), 0),
    employeeCount: payrollData.length,
    pendingCount: payrollData.filter(p => p.status === 'pending').length,
  } : null

  const dailySales = (dailySalesResult.data || []) as Array<{ date: string; revenue: number; order_count: number }>
  const revenueTrends = dailySales
    .slice(0, 30)
    .reverse()
    .map(d => ({ date: d.date, revenue: d.revenue || 0, orders: d.order_count || 0 }))

  const menuPerformance = (menuPerfResult.data || []) as Array<{ name: string; menu_item_id: string; total_quantity: number; total_revenue: number }>
  const popularItems = menuPerformance.slice(0, 10).map(item => ({
    name: item.name,
    menu_item_id: item.menu_item_id,
    total_quantity: item.total_quantity || 0,
    total_revenue: item.total_revenue || 0,
  }))

  const branchPerformance = branchList.map(branch => {
    const branchOrders = orders.filter(o => o.restaurant_id === branch.id)
    const branchRevenue = branchOrders.reduce((sum, o) => sum + Number(o.total_amount), 0)
    return {
      id: branch.id,
      name: branch.name,
      revenue: branchRevenue,
      orders: branchOrders.length,
      avgOrderValue: branchOrders.length > 0 ? branchRevenue / branchOrders.length : 0,
      tablesServed: new Set(branchOrders.map(o => o.id)).size,
    }
  })

  const ingredients = (ingredientsResult.data || []) as Array<{ quantity: number; unit_cost: number }>
  const totalInventoryValue = ingredients.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unit_cost)), 0)
  const inventorySummary = {
    totalIngredients: ingredients.length,
    lowStockCount,
    totalValue: totalInventoryValue,
  }

  const lastMonthOrders = orders.filter(o => {
    const d = new Date(o.created_at)
    return d >= lastMonthStart && d <= lastMonthEnd
  })
  const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => sum + Number(o.total_amount), 0)
  const revenueGrowth = lastMonthRevenue > 0 ? ((revenueMonth - lastMonthRevenue) / lastMonthRevenue) * 100 : 0
  const orderGrowth = lastMonthOrders.length > 0 ? ((ordersMonth - lastMonthOrders.length) / lastMonthOrders.length) * 100 : 0

  return NextResponse.json({
    data: {
      overview: {
        totalRevenue,
        revenueToday,
        revenueMonth,
        totalOrders,
        ordersToday,
        ordersMonth,
        activeEmployees,
        menuItemCount,
        lowStockCount,
        branchCount: branchList.length,
        averageOrderValue,
      },
      revenue_trends: revenueTrends,
      branch_performance: branchPerformance,
      popular_items: popularItems,
      payroll_summary: payrollSummary,
      inventory_summary: inventorySummary,
      growth_metrics: {
        revenueGrowth: Math.round(revenueGrowth * 100) / 100,
        orderGrowth: Math.round(orderGrowth * 100) / 100,
      },
    },
  })
}
