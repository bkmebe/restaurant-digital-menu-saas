import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole } from '@/lib/utils/tenant'

export async function GET() {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'cashier')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('payment_verifications')
    .select('*, order:orders(id, table_id, total_amount, status, created_at), verified_by_employee:employees!payment_verifications_verified_by_fkey(id, full_name)')
    .eq('restaurant_id', tenant.restaurantId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Database error occurred' } }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'cashier')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const body = await request.json()
  const { order_id, provider, verification_method, verification_reference, receipt_image_url, amount, payment_config_id } = body

  if (!provider) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'provider is required' } }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('payment_verifications')
    .insert({
      restaurant_id: tenant.restaurantId,
      order_id: order_id || null,
      payment_config_id: payment_config_id || null,
      provider,
      verification_method: verification_method || 'receipt_upload',
      verification_reference: verification_reference || null,
      receipt_image_url: receipt_image_url || null,
      amount: amount || null,
      currency: 'ETB',
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Database error occurred' } }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
