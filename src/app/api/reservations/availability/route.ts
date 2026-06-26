import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole } from '@/lib/utils/tenant'
import { findAvailableTables } from '@/lib/utils/reservations'

export async function GET(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'waiter')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId

  if (!restaurantId) {
    return NextResponse.json({ data: [] })
  }

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const time = searchParams.get('time')
  const guestCount = parseInt(searchParams.get('guestCount') || '1')
  const durationMinutes = parseInt(searchParams.get('durationMinutes') || '90')
  const excludeReservationId = searchParams.get('excludeReservationId')

  if (!date || !time) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'date and time are required' } }, { status: 400 })
  }

  const { data: tables } = await supabase
    .from('tables')
    .select('id, table_number, capacity')
    .eq('restaurant_id', restaurantId)
    .neq('status', 'cleaning')
    .order('table_number')

  const activeStatuses = ['pending', 'confirmed', 'seated']
  const { data: existing } = await supabase
    .from('reservations')
    .select('id, reservation_date, reservation_time, duration_minutes, status, reservation_tables(table_id)')
    .eq('restaurant_id', restaurantId)
    .eq('reservation_date', date)
    .in('status', activeStatuses)

  const available = findAvailableTables(
    tables || [],
    (existing || []).map(r => ({
      id: r.id,
      reservation_date: r.reservation_date,
      reservation_time: r.reservation_time,
      duration_minutes: r.duration_minutes,
      status: r.status,
      tables: r.reservation_tables || [],
    })),
    { date, time, durationMinutes },
    guestCount,
    excludeReservationId || undefined,
  )

  return NextResponse.json({ data: available })
}
