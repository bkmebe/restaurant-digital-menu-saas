import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole, requireMutate } from '@/lib/utils/tenant'

export async function POST(request: Request) {
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

  const body = await request.json()
  const { shift_ids } = body as { shift_ids?: string[] }

  if (!shift_ids || !Array.isArray(shift_ids) || shift_ids.length === 0) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'shift_ids array is required' } }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('staff_shifts')
    .update({ status: 'active' })
    .in('id', shift_ids)
    .eq('restaurant_id', restaurantId)
    .select()

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Failed to publish shifts' } }, { status: 500 })
  }

  // Create shift_assignments for any assigned employees
  const assignments = (data || []).filter((s: { employee_id: unknown }) => s.employee_id).map((s: { id: string; employee_id: string }) => ({
    shift_id: s.id,
    employee_id: s.employee_id,
  }))

  if (assignments.length > 0) {
    await supabase.from('shift_assignments').upsert(assignments, { onConflict: 'shift_id,employee_id' })
  }

  return NextResponse.json({ data: data || [] })
}
