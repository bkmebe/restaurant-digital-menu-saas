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
    return NextResponse.json({ data: [], coverage: {} })
  }

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!from || !to) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'from and to query params are required' } }, { status: 400 })
  }

  const [shiftsResult, employeesResult] = await Promise.all([
    supabase
      .from('staff_shifts')
      .select('*, employees(full_name, role)')
      .eq('restaurant_id', restaurantId)
      .gte('shift_date', from)
      .lte('shift_date', to)
      .order('shift_date', { ascending: true })
      .order('start_time', { ascending: true }),
    supabase
      .from('employees')
      .select('id, full_name, role')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true),
  ])

  const shifts = shiftsResult.data || []
  const employees = employeesResult.data || []

  const coverage: Record<string, { total: number; assigned: number; unassigned: number }> = {}
  for (const shift of shifts) {
    const date = shift.shift_date as string
    if (!coverage[date]) coverage[date] = { total: 0, assigned: 0, unassigned: 0 }
    coverage[date].total++
    if (shift.employee_id) coverage[date].assigned++
    else coverage[date].unassigned++
  }

  return NextResponse.json({ data: shifts, employees, coverage })
}
