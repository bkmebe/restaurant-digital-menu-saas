import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireMutate } from '@/lib/utils/tenant'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const mutateError = requireMutate(tenant)
  if (mutateError) return mutateError

  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId

  const body = await request.json()
  const { status, notes } = body as { status?: string; notes?: string }

  const updateData: Record<string, unknown> = {}
  if (status && ['present', 'absent', 'late', 'half_day', 'overtime'].includes(status)) {
    updateData.status = status
  }
  if (notes !== undefined) updateData.notes = notes

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'No valid fields to update' } }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('staff_attendance')
    .update(updateData)
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Attendance record not found' } }, { status: 404 })
  }

  return NextResponse.json({ data })
}
