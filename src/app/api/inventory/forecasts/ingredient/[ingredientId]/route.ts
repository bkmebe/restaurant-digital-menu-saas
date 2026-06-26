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
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'No restaurant assigned' } }, { status: 400 })
  }

  const [forecastResult, stockResult, movementsResult] = await Promise.all([
    supabase
      .from('inventory_forecasts')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('ingredient_id', ingredientId)
      .order('forecast_date', { ascending: true })
      .limit(90),
    supabase
      .from('stock_items')
      .select('*, ingredient:ingredients(*), unit:units_of_measure(symbol)')
      .eq('restaurant_id', restaurantId)
      .eq('ingredient_id', ingredientId)
      .single(),
    supabase
      .from('stock_movements')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('ingredient_id', ingredientId)
      .eq('type', 'deduction')
      .gte('created_at', nowMinusDays(90))
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  if (stockResult.error || !stockResult.data) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Stock item not found' } }, { status: 404 })
  }

  // Get supplier info for this ingredient
  const { data: suppliers } = await supabase
    .from('supplier_ingredients')
    .select('*, supplier:suppliers(name, phone, email, is_active)')
    .eq('ingredient_id', ingredientId)

  return NextResponse.json({
    forecasts: forecastResult.data || [],
    stockItem: stockResult.data,
    movements: movementsResult.data || [],
    suppliers: suppliers || [],
  })
}

function nowMinusDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}
