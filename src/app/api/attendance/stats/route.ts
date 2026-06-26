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

  if (!restaurantId) {
    return NextResponse.json({ today: {}, week: {}, month: {} })
  }

  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

  const [todayResult, weekResult, monthResult, employeesResult] = await Promise.all([
    supabase
      .from('staff_attendance')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('date', today),
    supabase
      .from('staff_attendance')
      .select('status, clock_in, clock_out, overtime_minutes, late_minutes, date')
      .eq('restaurant_id', restaurantId)
      .gte('date', weekAgo)
      .lte('date', today),
    supabase
      .from('staff_attendance')
      .select('id', { count: 'exact' })
      .eq('restaurant_id', restaurantId)
      .gte('date', monthStart)
      .lte('date', today),
    supabase
      .from('employees')
      .select('id', { count: 'exact' })
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true),
  ])

  const todayData = todayResult.data || []
  const weekData = weekResult.data || []
  const totalActive = employeesResult.count || 0

  const todayStats = {
    present: todayData.filter((r: { status: string }) => r.status === 'present').length,
    late: todayData.filter((r: { status: string }) => r.status === 'late').length,
    absent: todayData.filter((r: { status: string }) => r.status === 'absent').length,
    overtime: todayData.filter((r: { status: string }) => r.status === 'overtime').length,
    total: todayData.length,
    totalActive,
    clockedIn: todayData.filter((r: Record<string, unknown>) => r.clock_in && !r.clock_out).length,
  }

  const weekOvertime = weekData.reduce((sum: number, r: { overtime_minutes: number }) => sum + (r.overtime_minutes || 0), 0)
  const weekLate = weekData.reduce((sum: number, r: { late_minutes: number }) => sum + (r.late_minutes || 0), 0)

  return NextResponse.json({
    today: todayStats,
    week: {
      total: weekData.length,
      totalOvertimeMinutes: weekOvertime,
      totalLateMinutes: weekLate,
      uniqueDays: new Set(weekData.map((r: { date: string }) => r.date)).size,
    },
    month: {
      total: monthResult.count || 0,
    },
  })
}
