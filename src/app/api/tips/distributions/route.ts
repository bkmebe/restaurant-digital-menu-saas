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
  const { tip_pool_id, distributions } = body

  if (!tip_pool_id || !distributions || !Array.isArray(distributions) || distributions.length === 0) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'tip_pool_id and distributions array required' } }, { status: 400 })
  }

  const poolResult = await supabase
    .from('tip_pools')
    .select('id, total_collected, total_distributed, status')
    .eq('id', tip_pool_id)
    .eq('restaurant_id', restaurantId)
    .single()

  if (poolResult.error || !poolResult.data) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Pool not found' } }, { status: 404 })
  }

  if (poolResult.data.status !== 'closed') {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'Pool must be closed before distributing' } }, { status: 400 })
  }

  const rows = distributions.map((d: { employee_id: string; weight?: number; amount: number }) => ({
    restaurant_id: restaurantId,
    tip_pool_id,
    employee_id: d.employee_id,
    weight: d.weight ?? 1.0,
    amount: d.amount,
  }))

  const { data, error } = await supabase
    .from('tip_distributions')
    .insert(rows)
    .select()

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Database error occurred' } }, { status: 500 })
  }

  const totalDistributed = rows.reduce((s, r) => s + r.amount, 0)
  await supabase
    .from('tip_pools')
    .update({ status: 'distributed', total_distributed: totalDistributed })
    .eq('id', tip_pool_id)

  return NextResponse.json({ data }, { status: 201 })
}
