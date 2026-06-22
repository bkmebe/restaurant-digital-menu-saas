import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAuth, requireRole } from '@/lib/utils/auth-guard'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const roleError = requireRole(auth, 'manager')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const restaurantId = auth.profile.restaurant_id

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
