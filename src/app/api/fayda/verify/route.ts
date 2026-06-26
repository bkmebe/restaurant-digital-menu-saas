import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole } from '@/lib/utils/tenant'

export async function POST(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'admin')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const body = await request.json()
  const { id } = body

  if (!id) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'Verification id is required' } }, { status: 400 })
  }

  const { data: verification, error: fetchError } = await supabase
    .from('fayda_verifications')
    .select('*')
    .eq('id', id)
    .eq('restaurant_id', tenant.restaurantId)
    .single()

  if (fetchError || !verification) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Verification not found' } }, { status: 404 })
  }

  const { error: updateError } = await supabase
    .from('fayda_verifications')
    .update({
      verification_status: 'verified',
      verified_by: tenant.userId,
      verified_at: new Date().toISOString(),
      transaction_id: `FYD-${Date.now().toString(36).toUpperCase()}`,
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Database error occurred' } }, { status: 500 })
  }

  await supabase
    .from('employees')
    .update({
      fayda_verified: true,
      fayda_verified_at: new Date().toISOString(),
      fayda_transaction_id: `FYD-${Date.now().toString(36).toUpperCase()}`,
    })
    .eq('id', verification.employee_id)

  return NextResponse.json({ message: 'Verification confirmed' })
}
