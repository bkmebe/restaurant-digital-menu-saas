import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole } from '@/lib/utils/tenant'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'cashier')
  if (roleError) return roleError

  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('payment_verifications')
    .select('*, order:orders(*), verified_by_employee:employees!payment_verifications_verified_by_fkey(id, full_name)')
    .eq('id', id)
    .eq('restaurant_id', tenant.restaurantId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Verification not found' } }, { status: 404 })
  }

  return NextResponse.json({ data })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'cashier')
  if (roleError) return roleError

  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const body = await request.json()
  const { status, verified_notes } = body

  if (!status || !['verified', 'rejected', 'disputed'].includes(status)) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'Status must be verified, rejected, or disputed' } }, { status: 400 })
  }

  const { data: existing, error: fetchError } = await supabase
    .from('payment_verifications')
    .select('*')
    .eq('id', id)
    .eq('restaurant_id', tenant.restaurantId)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Verification not found' } }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('payment_verifications')
    .update({
      status,
      verified_by: tenant.userId,
      verified_at: new Date().toISOString(),
      verified_notes: verified_notes || null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Database error occurred' } }, { status: 500 })
  }

  if (status === 'verified' && existing.order_id) {
    await supabase
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', existing.order_id)
  }

  return NextResponse.json({ data })
}
