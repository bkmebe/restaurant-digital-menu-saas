import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole } from '@/lib/utils/tenant'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'manager')
  if (roleError) return roleError

  const { employeeId } = await params
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('fayda_verifications')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('restaurant_id', tenant.restaurantId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Database error occurred' } }, { status: 500 })
  }

  return NextResponse.json({ data })
}
