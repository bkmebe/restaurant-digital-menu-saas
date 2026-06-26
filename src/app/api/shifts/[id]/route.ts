import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole, requireMutate } from '@/lib/utils/tenant'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const supabase = await createServerSupabaseClient()
  const { id } = await params
  const profileId = tenant.userId
  const role = tenant.role

  let query = supabase
    .from('staff_shifts')
    .select('*, employees(full_name, role), shift_assignments(*, employees(full_name))')
    .eq('id', id)

  if (role === 'admin' || role === 'manager' || role === 'owner' || role === 'system_admin') {
    if (tenant.restaurantId) query = query.eq('restaurant_id', tenant.restaurantId)
  } else {
    const { data: emp } = await supabase
      .from('employees')
      .select('id')
      .eq('profile_id', profileId)
      .single()
    if (emp) query = query.eq('employee_id', emp.id)
  }

  const { data, error } = await query.single()

  if (error || !data) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Shift not found' } }, { status: 404 })
  }

  return NextResponse.json({ data })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'manager')
  if (roleError) return roleError

  const mutateError = requireMutate(tenant)
  if (mutateError) return mutateError

  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId

  const body = await request.json()
  const { title, shift_date, start_time, end_time, break_minutes, status, notes, employee_id } = body as Record<string, unknown>

  const updateData: Record<string, unknown> = {}
  if (title) updateData.title = title
  if (shift_date) updateData.shift_date = shift_date
  if (start_time) updateData.start_time = start_time
  if (end_time) updateData.end_time = end_time
  if (break_minutes !== undefined) updateData.break_minutes = break_minutes
  if (status && ['scheduled', 'active', 'completed', 'cancelled', 'missed'].includes(status as string)) {
    updateData.status = status
  }
  if (notes !== undefined) updateData.notes = notes
  if (employee_id !== undefined) updateData.employee_id = employee_id

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'No valid fields to update' } }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('staff_shifts')
    .update(updateData)
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Shift not found' } }, { status: 404 })
  }

  return NextResponse.json({ data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'manager')
  if (roleError) return roleError

  const mutateError = requireMutate(tenant)
  if (mutateError) return mutateError

  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId

  const { error } = await supabase
    .from('staff_shifts')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', restaurantId)

  if (error) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Shift not found' } }, { status: 404 })
  }

  return NextResponse.json({ data: { id } })
}
