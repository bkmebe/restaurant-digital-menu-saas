import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/utils/tenant'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId
  const { orderId } = await params

  if (!restaurantId) {
    return NextResponse.json({ data: [], total: 0 })
  }

  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('order_id', orderId)
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Failed to fetch receipts' } }, { status: 500 })
  }

  return NextResponse.json({ data: data || [] })
}
