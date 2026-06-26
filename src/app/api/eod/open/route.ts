import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole, requireMutate } from '@/lib/utils/tenant'

export async function POST() {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'manager')
  if (roleError) return roleError

  const mutateError = requireMutate(tenant)
  if (mutateError) return mutateError

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId

  if (!restaurantId) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'No restaurant assigned' } }, { status: 400 })
  }

  const today = new Date().toISOString().slice(0, 10)

  // Check if already open for today
  const { data: existing } = await supabase
    .from('eod_closings')
    .select('id, status')
    .eq('restaurant_id', restaurantId)
    .eq('business_date', today)
    .single()

  if (existing && existing.status !== 'approved') {
    return NextResponse.json({ data: existing }, { status: 200 })
  }

  if (existing?.status === 'approved') {
    return NextResponse.json({ error: { code: 'ALREADY_CLOSED', message: 'EOD already closed for today' } }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('eod_closings')
    .insert({
      restaurant_id: restaurantId,
      business_date: today,
      opened_at: new Date().toISOString(),
      status: 'open',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Failed to open EOD' } }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
