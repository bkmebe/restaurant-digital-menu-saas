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
  const { shift_id, from_employee_id, to_employee_id } = body as {
    shift_id?: string
    from_employee_id?: string
    to_employee_id?: string
  }

  if (!shift_id || !from_employee_id || !to_employee_id) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'shift_id, from_employee_id, and to_employee_id are required' } }, { status: 400 })
  }

  const { data: shift } = await supabase
    .from('staff_shifts')
    .select('id')
    .eq('id', shift_id)
    .eq('restaurant_id', restaurantId)
    .single()

  if (!shift) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Shift not found in this restaurant' } }, { status: 404 })
  }

  const [updateResult] = await Promise.all([
    supabase.from('staff_shifts').update({ employee_id: to_employee_id }).eq('id', shift_id),
    supabase.from('shift_assignments').update({ status: 'declined' }).eq('shift_id', shift_id).eq('employee_id', from_employee_id),
    supabase.from('shift_assignments').upsert({ shift_id, employee_id: to_employee_id }, { onConflict: 'shift_id,employee_id' }),
  ])

  return NextResponse.json({ data: { shift_id, from_employee_id, to_employee_id } })
}
