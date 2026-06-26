import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/utils/tenant'
import { determineStockoutRisk } from '@/lib/utils/forecast'

export async function GET() {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId

  if (!restaurantId) {
    return NextResponse.json({ data: [], summary: {} })
  }

  const [stockResult, movementsResult] = await Promise.all([
    supabase
      .from('stock_items')
      .select('*, ingredient:ingredients(name, name_am, name_om, category, unit_id), unit:units_of_measure(symbol)')
      .eq('restaurant_id', restaurantId)
      .order('current_quantity', { ascending: true }),
    supabase
      .from('stock_movements')
      .select('ingredient_id, quantity, created_at')
      .eq('restaurant_id', restaurantId)
      .eq('type', 'deduction')
      .gte('created_at', nowMinusDays(30)),
  ])

  const stockItems = stockResult.data || []
  const movements = movementsResult.data || []

  // Group movements by ingredient
  const usageMap = new Map<string, number[]>()
  for (const m of movements) {
    const key = m.ingredient_id as string
    if (!usageMap.has(key)) usageMap.set(key, [])
    usageMap.get(key)!.push(Math.abs(m.quantity as number))
  }

  const lowStock = stockItems
    .filter((s: { current_quantity: number; reorder_level: number }) => s.current_quantity <= s.reorder_level)
    .map((s: Record<string, unknown>) => {
      const usage = usageMap.get(s.ingredient_id as string) || []
      const dailyUsage = usage.length > 0 ? usage.reduce((a, b) => a + b, 0) / Math.min(usage.length, 30) : 0
      const daysUntil = dailyUsage > 0 ? Math.floor((s.current_quantity as number) / dailyUsage) : 999
      return {
        ...s,
        daily_usage_rate: Math.round(dailyUsage * 100) / 100,
        days_until_stockout: daysUntil,
        risk: determineStockoutRisk(daysUntil, 3),
      }
    })
    .sort((a: { days_until_stockout: number }, b: { days_until_stockout: number }) => a.days_until_stockout - b.days_until_stockout)

  const critical = lowStock.filter((s: { risk: string }) => s.risk === 'critical').length
  const high = lowStock.filter((s: { risk: string }) => s.risk === 'high').length

  return NextResponse.json({
    data: lowStock,
    summary: {
      total_low_stock: lowStock.length,
      critical,
      high,
    },
  })
}

function nowMinusDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}
