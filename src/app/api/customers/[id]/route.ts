import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole, requireMutate } from '@/lib/utils/tenant'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId
  const { id } = await params

  const { data, error } = await supabase
    .from('customers')
    .select(`*,
      reward_points:reward_points(points, source, created_at)
    `)
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Customer not found' } }, { status: 404 })
  }

  const pointsBalance = Array.isArray(data.reward_points)
    ? data.reward_points.reduce((sum: number, rp: { points: number }) => sum + rp.points, 0)
    : 0

  return NextResponse.json({ data: { ...data, points_balance: pointsBalance } })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'waiter')
  if (roleError) return roleError

  const mutateError = requireMutate(tenant)
  if (mutateError) return mutateError

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId
  const { id } = await params

  const body = await request.json()
  const { name, phone, email, notes, tags } = body

  const { data, error } = await supabase
    .from('customers')
    .update({
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(notes !== undefined && { notes }),
      ...(tags !== undefined && { tags }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: { code: 'DUPLICATE', message: 'Phone or email already in use' } }, { status: 409 })
    }
    return NextResponse.json({ error: { code: 'UPDATE_ERROR', message: 'Failed to update record' } }, { status: 400 })
  }

  return NextResponse.json({ data })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'admin')
  if (roleError) return roleError

  const mutateError = requireMutate(tenant)
  if (mutateError) return mutateError

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId
  const { id } = await params

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', restaurantId)

  if (error) {
    return NextResponse.json({ error: { code: 'DELETE_ERROR', message: 'Failed to delete record' } }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
