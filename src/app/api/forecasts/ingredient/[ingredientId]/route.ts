import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/utils/tenant'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ingredientId: string }> }
) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId
  const { ingredientId } = await params

  if (!restaurantId) {
    return NextResponse.json({ data: [] })
  }

  const today = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('inventory_forecasts')
    .select('*, ingredient:ingredients(name, unit)')
    .eq('restaurant_id', restaurantId)
    .eq('ingredient_id', ingredientId)
    .gte('forecast_date', today)
    .order('forecast_date', { ascending: true })
    .limit(30)

  return NextResponse.json({ data: data || [] })
}
