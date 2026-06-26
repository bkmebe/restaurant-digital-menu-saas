import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireMutate } from '@/lib/utils/tenant'
import { calculateOvertimeMinutes, calculateLateMinutes } from '@/lib/utils/attendance'

export async function POST(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const mutateError = requireMutate(tenant)
  if (mutateError) return mutateError

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId
  const profileId = tenant.userId

  if (!restaurantId) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'No restaurant assigned' } }, { status: 400 })
  }

  const body = await request.json()
  const { action } = body as { action?: string }

  if (!action || !['clock_in', 'clock_out', 'break_start', 'break_end'].includes(action)) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'Invalid action. Must be clock_in, clock_out, break_start, or break_end' } }, { status: 400 })
  }

  // Get employee record for this profile
  const { data: employee } = await supabase
    .from('employees')
    .select('id, full_name, restaurant_id')
    .eq('profile_id', profileId)
    .eq('restaurant_id', restaurantId)
    .single()

  if (!employee) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Employee record not found' } }, { status: 404 })
  }

  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null

  // Log the action
  await supabase.from('attendance_logs').insert({
    restaurant_id: restaurantId,
    employee_id: employee.id,
    action,
    ip_address: ip,
  })

  const today = new Date().toISOString().slice(0, 10)

  if (action === 'clock_in') {
    // Check if already clocked in today
    const { data: existing } = await supabase
      .from('staff_attendance')
      .select('id, clock_in, clock_out')
      .eq('employee_id', employee.id)
      .eq('date', today)
      .single()

    if (existing?.clock_in && !existing?.clock_out) {
      return NextResponse.json({ error: { code: 'ALREADY_CLOCKED_IN', message: 'Already clocked in today' } }, { status: 409 })
    }

    const now = new Date().toISOString()
    const lateMinutes = calculateLateMinutes(now, '09:00')

    const { data: record, error } = await supabase
      .from('staff_attendance')
      .upsert({
        employee_id: employee.id,
        restaurant_id: restaurantId,
        date: today,
        clock_in: now,
        status: lateMinutes > 15 ? 'late' : 'present',
        late_minutes: lateMinutes,
      }, { onConflict: 'employee_id,date' })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Failed to clock in' } }, { status: 500 })
    }

    return NextResponse.json({ data: record }, { status: 200 })
  }

  if (action === 'clock_out') {
    const { data: existing } = await supabase
      .from('staff_attendance')
      .select('id, clock_in, clock_out, total_break_minutes')
      .eq('employee_id', employee.id)
      .eq('date', today)
      .single()

    if (!existing?.clock_in) {
      return NextResponse.json({ error: { code: 'NOT_CLOCKED_IN', message: 'Not clocked in today' } }, { status: 400 })
    }

    if (existing?.clock_out) {
      return NextResponse.json({ error: { code: 'ALREADY_CLOCKED_OUT', message: 'Already clocked out today' } }, { status: 409 })
    }

    const now = new Date().toISOString()
    const overtimeMinutes = calculateOvertimeMinutes(existing.clock_in, now, '17:00')

    const { data: record, error } = await supabase
      .from('staff_attendance')
      .update({
        clock_out: now,
        overtime_minutes: overtimeMinutes,
        status: overtimeMinutes > 0 ? 'overtime' : 'present',
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Failed to clock out' } }, { status: 500 })
    }

    return NextResponse.json({ data: record }, { status: 200 })
  }

  // Break actions
  if (action === 'break_start') {
    return NextResponse.json({ data: { action, employee_id: employee.id, timestamp: new Date().toISOString() } })
  }

  if (action === 'break_end') {
    const { data: breakStart } = await supabase
      .from('attendance_logs')
      .select('timestamp')
      .eq('employee_id', employee.id)
      .eq('action', 'break_start')
      .gte('timestamp', `${today}T00:00:00`)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (breakStart) {
      const breakMinutes = Math.round((Date.now() - new Date(breakStart.timestamp).getTime()) / 60000)
      if (breakMinutes > 0) {
        const { data: attendance } = await supabase
          .from('staff_attendance')
          .select('id, total_break_minutes')
          .eq('employee_id', employee.id)
          .eq('date', today)
          .maybeSingle()

        if (attendance) {
          await supabase
            .from('staff_attendance')
            .update({ total_break_minutes: (attendance.total_break_minutes || 0) + breakMinutes })
            .eq('id', attendance.id)
        }
      }
    }

    return NextResponse.json({ data: { action, employee_id: employee.id, timestamp: new Date().toISOString() } })
  }

  return NextResponse.json({ error: { code: 'UNKNOWN_ACTION', message: 'Unknown action' } }, { status: 400 })
}
