import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole, requireMutate } from '@/lib/utils/tenant'

export async function GET(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId

  if (!restaurantId) {
    return NextResponse.json({ data: [], total: 0 })
  }

  const { searchParams } = new URL(request.url)
  const ingredientId = searchParams.get('ingredientId')
  const risk = searchParams.get('stockoutRisk')
  const reordering = searchParams.get('reordering')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20')))
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('inventory_forecasts')
    .select('*, ingredient:ingredients(name, unit)', { count: 'exact' })
    .eq('restaurant_id', restaurantId)
    .order('forecast_date', { ascending: true })
    .range(offset, offset + pageSize - 1)

  if (ingredientId) query = query.eq('ingredient_id', ingredientId)
  if (risk) query = query.eq('stockout_risk', risk)
  if (reordering === 'true') query = query.eq('reorder_recommended', true)
  if (from) query = query.gte('forecast_date', from)
  if (to) query = query.lte('forecast_date', to)

  const { data, count } = await query

  return NextResponse.json({
    data: data || [],
    total: count || 0,
    page,
    pageSize,
  })
}

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

  const { data, error } = await supabase.rpc('generate_ingredient_forecast', {
    p_restaurant_id: restaurantId,
    p_ingredient_id: ingredient_id,
    p_days: forecastDays,
  })

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Failed to generate forecast' } }, { status: 500 })
  }

  return NextResponse.json({ data: data || [] }, { status: 201 })
}
