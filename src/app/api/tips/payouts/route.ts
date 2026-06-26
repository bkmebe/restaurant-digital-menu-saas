import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole, requireMutate } from '@/lib/utils/tenant'

export async function PUT(request: Request) {
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
  const { distribution_ids } = body

  if (!distribution_ids || !Array.isArray(distribution_ids) || distribution_ids.length === 0) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'distribution_ids array required' } }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tip_distributions')
    .update({
      is_paid: true,
      paid_at: new Date().toISOString(),
      paid_by: tenant.userId,
    })
    .in('id', distribution_ids)
    .eq('restaurant_id', restaurantId)
    .eq('is_paid', false)
    .select()

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Database error occurred' } }, { status: 500 })
  }

  return NextResponse.json({ data, success: true })
}
