import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/utils/tenant'
import { determineStockoutRisk, determineReorderUrgency } from '@/lib/utils/forecast'

export async function GET() {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId

  if (!restaurantId) {
    return NextResponse.json({ forecasts: [], summary: null })
  }

  const today = new Date().toISOString().slice(0, 10)

  const [forecastsResult, stockResult, suggestionsResult] = await Promise.all([
    supabase
      .from('inventory_forecasts')
      .select('*, ingredient:ingredients(name, name_am, name_om, category)')
      .eq('restaurant_id', restaurantId)
      .gte('forecast_date', today)
      .order('forecast_date', { ascending: true })
      .limit(500),
    supabase
      .from('stock_items')
      .select('*, ingredient:ingredients(name, name_am, name_om, category, unit_id), unit:units_of_measure(symbol)')
      .eq('restaurant_id', restaurantId)
      .order('current_quantity', { ascending: true }),
    supabase
      .from('reorder_suggestions')
      .select('*, ingredient:ingredients(name), preferred_supplier:suppliers(name)')
      .eq('restaurant_id', restaurantId)
      .eq('is_actioned', false)
      .order('urgency', { ascending: true }),
  ])

  const forecasts = forecastsResult.data || []
  const stockItems = stockResult.data || []
  const suggestions = suggestionsResult.data || []

  const lowStockItems = stockItems
    .filter((s: { current_quantity: number; reorder_level: number }) => s.current_quantity <= s.reorder_level)
    .map((s: Record<string, unknown>) => {
      const dailyUsage = 0
      const daysUntil = dailyUsage > 0 ? Math.floor((s.current_quantity as number) / dailyUsage) : 999
      return {
        ...s,
        days_until_stockout: daysUntil,
        risk: determineStockoutRisk(daysUntil, 3),
        urgency: determineReorderUrgency(daysUntil, 3),
      }
    })

  return NextResponse.json({
    forecasts,
    stockItems,
    suggestions,
    lowStockItems,
    summary: {
      total_forecasted: forecasts.length,
      total_suggestions: suggestions.length,
      low_stock_count: lowStockItems.length,
    },
  })
}
