import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole } from '@/lib/utils/tenant'

export async function GET() {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'manager')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId

  if (!restaurantId) {
    return NextResponse.json({ data: null, sales_summary: null })
  }

  const today = new Date().toISOString().slice(0, 10)

  const [closingResult, ordersResult] = await Promise.all([
    supabase
      .from('eod_closings')
      .select('*, eod_closing_items(*), eod_approvals(*)')
      .eq('restaurant_id', restaurantId)
      .eq('business_date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .rpc('get_eod_sales_summary', { p_restaurant_id: restaurantId, p_date: today }),
  ])

  return NextResponse.json({
    data: closingResult.data || null,
    sales_summary: ordersResult.data || null,
  })
}
