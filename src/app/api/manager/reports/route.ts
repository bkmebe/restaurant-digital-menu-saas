import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole } from '@/lib/utils/tenant'

export async function GET() {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'manager')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId

  const [dailySales, menuPerformance, staffPerformance, tableUtilization] = await Promise.all([
    supabase.from('mv_daily_sales').select('*').eq('restaurant_id', restaurantId).order('date', { ascending: false }).limit(30),
    supabase.from('mv_menu_performance').select('*').eq('restaurant_id', restaurantId).order('total_orders', { ascending: false }).limit(20),
    supabase.from('mv_staff_performance').select('*').eq('restaurant_id', restaurantId).order('total_orders', { ascending: false }).limit(20),
    supabase.from('mv_table_utilization').select('*').eq('restaurant_id', restaurantId),
  ])

  const data = {
    daily_sales: dailySales.data || [],
    menu_performance: menuPerformance.data || [],
    staff_performance: staffPerformance.data || [],
    table_utilization: tableUtilization.data || [],
  }

  return NextResponse.json({ data })
}
