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
    return NextResponse.json({ data: [], total: 0 })
  }

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const status = searchParams.get('status')
  const employeeId = searchParams.get('employeeId')
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '50', 10)
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('staff_attendance')
    .select('*, employees(full_name, role)', { count: 'exact' })
    .eq('restaurant_id', restaurantId)

  if (from) query = query.gte('date', from)
  if (to) query = query.lte('date', to)
  if (status) query = query.eq('status', status)
  if (employeeId) query = query.eq('employee_id', employeeId)

  const { data, count, error } = await query
    .order('date', { ascending: false })
    .order('clock_in', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Failed to fetch history' } }, { status: 500 })
  }

  return NextResponse.json({
    data: data || [],
    total: count || 0,
    page,
    pageSize,
  })
}
