import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole, requireMutate } from '@/lib/utils/tenant'

export async function POST(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'inventory_manager')
  if (roleError) return roleError

  const mutateError = requireMutate(tenant)
  if (mutateError) return mutateError

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId

  if (!restaurantId) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'No restaurant assigned' } }, { status: 400 })
  }

  const body = await request.json()
  const { ingredient_id, days } = body as { ingredient_id?: string; days?: number }

  if (!ingredient_id) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'ingredient_id is required' } }, { status: 400 })
  }

  const forecastDays = Math.min(90, Math.max(1, days || 30))

  const { data, error } = await supabase
    .rpc('generate_ingredient_forecast', {
      p_restaurant_id: restaurantId,
      p_ingredient_id: ingredient_id,
      p_days: forecastDays,
    })

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Failed to generate forecast' } }, { status: 500 })
  }

  return NextResponse.json({ data: data || [] }, { status: 201 })
}
