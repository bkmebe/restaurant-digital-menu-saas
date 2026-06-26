import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/utils/tenant'

export async function GET() {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId

  if (!restaurantId) {
    return NextResponse.json({ data: [] })
  }

  const today = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('inventory_forecasts')
    .select('*, ingredient:ingredients(name, unit, category), recommended_supplier:suppliers(name)')
    .eq('restaurant_id', restaurantId)
    .eq('forecast_date', today)
    .order('stockout_risk', { ascending: false })

  return NextResponse.json({ data: data || [] })
}
