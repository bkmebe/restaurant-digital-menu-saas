import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole, requireMutate } from '@/lib/utils/tenant'

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

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId
  const { id } = await params

  if (!restaurantId) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'No restaurant assigned' } }, { status: 400 })
  }

  const body = await request.json()
  const { waiter_id } = body as { waiter_id?: string | null }

  if (waiter_id !== null && waiter_id !== undefined) {
    const { data: employee } = await supabase
      .from('employees')
      .select('id, role')
      .eq('id', waiter_id)
      .eq('restaurant_id', restaurantId)
      .single()

    if (!employee) {
      return NextResponse.json({ error: { code: 'VALIDATION', message: 'Employee not found' } }, { status: 404 })
    }

    if (employee.role !== 'waiter') {
      return NextResponse.json({ error: { code: 'VALIDATION', message: 'Only waiters can be assigned to tables' } }, { status: 400 })
    }
  }

  const { data, error } = await supabase
    .from('tables')
    .update({ assigned_waiter_id: waiter_id || null })
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Failed to assign waiter' } }, { status: 500 })
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

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId
  const { id } = await params

  if (!restaurantId) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'No restaurant assigned' } }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tables')
    .update({ assigned_waiter_id: null })
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Failed to unassign waiter' } }, { status: 500 })
  }

  return NextResponse.json({ data })
}
