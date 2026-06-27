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
  const restaurantId = tenant.restaurantId
  const { id } = await params

  if (!restaurantId) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'No restaurant assigned' } }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('reservations')
    .select('*, reservation_tables(table_id, tables:table_id(id, table_number, capacity))')
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Reservation not found' } }, { status: 404 })
  }

  return NextResponse.json({ data })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'waiter')
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
  const { table_ids, ...updateData } = body

  const { data, error } = await supabase
    .from('reservations')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'UPDATE_ERROR', message: 'Failed to update record' } }, { status: 400 })
  }

  if (table_ids && Array.isArray(table_ids)) {
    await supabase.from('reservation_tables').delete().eq('reservation_id', id)
    if (table_ids.length > 0) {
      const tableRows = table_ids.map((table_id: string) => ({
        reservation_id: id,
        table_id,
      }))
      await supabase.from('reservation_tables').insert(tableRows)
    }
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

  const { error } = await supabase
    .from('reservations')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('restaurant_id', restaurantId)

  if (error) {
    return NextResponse.json({ error: { code: 'DELETE_ERROR', message: 'Failed to delete record' } }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
