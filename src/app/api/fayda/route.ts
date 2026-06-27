import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole, requireMutate } from '@/lib/utils/tenant'

export async function GET() {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'manager')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('fayda_verifications')
    .select('*, employee:employees(id, full_name, phone, fayda_number, fayda_verified, fayda_verified_at)')
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

  const roleError = requireRole(tenant, 'admin')
  if (roleError) return roleError

  const mutateError = requireMutate(tenant)
  if (mutateError) return mutateError

  const supabase = await createServerSupabaseClient()
  const body = await request.json()
  const { employee_id, fayda_number } = body

  if (!employee_id || !fayda_number) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'employee_id and fayda_number are required' } }, { status: 400 })
  }

  const restaurantId = tenant.restaurantId
  const profileId = tenant.userId

  const { data: verification, error: insertError } = await supabase
    .from('fayda_verifications')
    .insert({
      restaurant_id: restaurantId,
      employee_id,
      fayda_number,
      verification_status: 'verified',
      transaction_id: `FYD-${Date.now().toString(36).toUpperCase()}`,
      verified_by: profileId,
      verified_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Database error occurred' } }, { status: 500 })
  }

  await supabase
    .from('employees')
    .update({
      fayda_number,
      fayda_verified: true,
      fayda_verified_at: new Date().toISOString(),
      fayda_transaction_id: verification.transaction_id,
    })
    .eq('id', employee_id)

  return NextResponse.json({ data: verification }, { status: 201 })
}
