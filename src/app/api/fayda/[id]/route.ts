import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole } from '@/lib/utils/tenant'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'manager')
  if (roleError) return roleError

  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('fayda_verifications')
    .select('*, employee:employees(id, full_name, phone, fayda_number, fayda_verified)')
    .eq('id', id)
    .eq('restaurant_id', tenant.restaurantId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Verification not found' } }, { status: 404 })
  }

  return NextResponse.json({ data })
}
