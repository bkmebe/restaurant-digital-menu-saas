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
    return NextResponse.json({ data: [], employees: [] })
  }

  const today = new Date().toISOString().slice(0, 10)

  const [attendanceResult, employeesResult] = await Promise.all([
    supabase
      .from('staff_attendance')
      .select('*, employees(full_name, role)')
      .eq('restaurant_id', restaurantId)
      .eq('date', today)
      .order('clock_in', { ascending: false }),
    supabase
      .from('employees')
      .select('id, full_name')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true),
  ])

  return NextResponse.json({
    data: attendanceResult.data || [],
    employees: employeesResult.data || [],
  })
}
