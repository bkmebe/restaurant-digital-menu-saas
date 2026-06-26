import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole, requireMutate } from '@/lib/utils/tenant'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'cashier')
  if (roleError) return roleError

  const mutateError = requireMutate(tenant)
  if (mutateError) return mutateError

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId
  const { id } = await params

  if (!restaurantId) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'No restaurant assigned' } }, { status: 400 })
  }

  const body = await request.json()
  const { email } = body as { email?: string }

  if (!email) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'Email is required' } }, { status: 400 })
  }

  const { data: receipt } = await supabase
    .from('receipts')
    .select('*')
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
    .single()

  if (!receipt) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Receipt not found' } }, { status: 404 })
  }

  const { error: updateError } = await supabase
    .from('receipts')
    .update({
      sent_to: email,
      sent_at: new Date().toISOString(),
      status: 'sent',
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Failed to update receipt' } }, { status: 500 })
  }

  const { data: updated } = await supabase
    .from('receipts')
    .select('*')
    .eq('id', id)
    .single()

  return NextResponse.json({ data: updated })
}
