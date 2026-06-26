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
  const { shift_id, employee_id } = body as { shift_id?: string; employee_id?: string }

  if (!shift_id || !employee_id) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'shift_id and employee_id are required' } }, { status: 400 })
  }

  const { data: assignment, error } = await supabase
    .from('shift_assignments')
    .upsert({ shift_id, employee_id }, { onConflict: 'shift_id,employee_id' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Failed to assign employee' } }, { status: 500 })
  }

  await supabase
    .from('staff_shifts')
    .update({ employee_id })
    .eq('id', shift_id)
    .eq('restaurant_id', restaurantId)

  return NextResponse.json({ data: assignment }, { status: 201 })
}
