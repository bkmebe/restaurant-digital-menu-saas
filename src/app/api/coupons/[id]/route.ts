import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole } from '@/lib/utils/tenant'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId
  const { id } = await params

  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Coupon not found' } }, { status: 404 })
  }

  return NextResponse.json({ data })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'manager')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId
  const { id } = await params

  const body = await request.json()
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

  const allowedFields = ['code', 'type', 'value', 'min_order_amount', 'max_discount', 'usage_limit', 'usage_per_customer', 'is_active', 'starts_at', 'expires_at', 'description', 'applicable_customer_tags']
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = field === 'code' ? body[field].trim().toUpperCase() : body[field]
    }
  }

  const { data, error } = await supabase
    .from('coupons')
    .update(updateData)
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: { code: 'DUPLICATE', message: 'Coupon code already exists' } }, { status: 409 })
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

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId
  const { id } = await params

  const { error } = await supabase
    .from('coupons')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', restaurantId)

  if (error) {
    return NextResponse.json({ error: { code: 'DELETE_ERROR', message: 'Failed to delete record' } }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
