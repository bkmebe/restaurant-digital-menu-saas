import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole, requireMutate } from '@/lib/utils/tenant'

export async function POST(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'manager')
  if (roleError) return roleError

  const mutateError = requireMutate(tenant)
  if (mutateError) return mutateError

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId

  if (!restaurantId) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'No restaurant assigned' } }, { status: 400 })
  }

  const body = await request.json()
  const { title, shift_date, start_time, end_time, break_minutes, notes, employee_id } = body as {
    title?: string
    shift_date?: string
    start_time?: string
    end_time?: string
    break_minutes?: number
    notes?: string
    employee_id?: string
  }

  if (!title || !shift_date || !start_time || !end_time) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'title, shift_date, start_time, and end_time are required' } }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('staff_shifts')
    .insert({
      restaurant_id: restaurantId,
      employee_id: employee_id || null,
      title,
      shift_date,
      start_time,
      end_time,
      break_minutes: break_minutes || 0,
      notes: notes || null,
      created_by: tenant.userId,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Failed to create shift' } }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}

export async function GET(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'manager')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId
  const profileId = tenant.userId
  const role = tenant.role

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const status = searchParams.get('status')
  const employeeId = searchParams.get('employeeId')
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '50', 10)
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('staff_shifts')
    .select('*, employees(full_name, role), shift_assignments(*, employees(full_name))', { count: 'exact' })

  if (role === 'admin' || role === 'manager' || role === 'system_admin') {
    if (restaurantId) query = query.eq('restaurant_id', restaurantId)
  } else {
    query = query.eq('employee_id', employeeId || (await getEmployeeId(supabase, profileId)))
  }

  if (from) query = query.gte('shift_date', from)
  if (to) query = query.lte('shift_date', to)
  if (status) query = query.eq('status', status)
  if (employeeId && (role === 'admin' || role === 'manager')) query = query.eq('employee_id', employeeId)

  const { data, count, error } = await query
    .order('shift_date', { ascending: false })
    .order('start_time', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Failed to fetch shifts' } }, { status: 500 })
  }

  return NextResponse.json({
    data: data || [],
    total: count || 0,
    page,
    pageSize,
  })
}

async function getEmployeeId(supabase: ReturnType<typeof Object>, profileId: string): Promise<string | null> {
  const { data } = await supabase
    .from('employees')
    .select('id')
    .eq('profile_id', profileId)
    .single()
  return data?.id || null
}
