import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/utils/tenant'

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
  const risk = searchParams.get('risk')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '50')))
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('inventory_forecasts')
    .select('*, ingredient:ingredients(name, name_am, name_om, category)', { count: 'exact' })
    .eq('restaurant_id', restaurantId)
    .order('forecast_date', { ascending: true })
    .range(offset, offset + pageSize - 1)

  if (ingredientId) query = query.eq('ingredient_id', ingredientId)
  if (risk) query = query.eq('stockout_risk', risk)
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
