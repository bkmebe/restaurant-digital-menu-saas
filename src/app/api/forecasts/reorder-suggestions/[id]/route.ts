import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireMutate } from '@/lib/utils/tenant'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const mutateError = requireMutate(tenant)
  if (mutateError) return mutateError

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId
  const { id } = await params

  if (!restaurantId) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'No restaurant assigned' } }, { status: 400 })
  }

  const body = await request.json()

  const allowedFields = ['is_actioned', 'actioned_by', 'actioned_at', 'suggested_order_qty', 'preferred_supplier_id']

  const updates: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      updates[key] = body[key]
    }
  }

  if (updates.is_actioned === true) {
    updates.actioned_by = tenant.userId
    updates.actioned_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('reorder_suggestions')
    .update(updates)
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Failed to update reorder suggestion' } }, { status: 500 })
  }

  return NextResponse.json({ data })
}
