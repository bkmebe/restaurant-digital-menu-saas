import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole } from '@/lib/utils/tenant'

export async function GET(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'waiter')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId

  if (!restaurantId) {
    return NextResponse.json({ data: [], total: 0 })
  }

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20')))
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('reservations')
    .select('*, reservation_tables(table_id, tables:table_id(id, table_number, capacity))', { count: 'exact' })
    .eq('restaurant_id', restaurantId)
    .order('reservation_date', { ascending: true })
    .order('reservation_time', { ascending: true })
    .range(offset, offset + pageSize - 1)

  if (date) query = query.eq('reservation_date', date)
  if (status) query = query.eq('status', status)
  if (search) {
    query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`)
  }

  const { data, count } = await query

  return NextResponse.json({
    data: data || [],
    total: count || 0,
    page,
    pageSize,
  })
}

export async function POST(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'waiter')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId

  if (!restaurantId) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'No restaurant assigned' } }, { status: 400 })
  }

  const body = await request.json()
  const { table_ids, ...reservationData } = body

  const { data, error } = await supabase
    .from('reservations')
    .insert({
      restaurant_id: restaurantId,
      customer_name: reservationData.customer_name,
      customer_phone: reservationData.customer_phone || null,
      customer_email: reservationData.customer_email || null,
      guest_count: reservationData.guest_count,
      reservation_date: reservationData.reservation_date,
      reservation_time: reservationData.reservation_time,
      duration_minutes: reservationData.duration_minutes || 90,
      status: 'pending',
      special_requests: reservationData.special_requests || null,
      notes: reservationData.notes || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'INSERT_ERROR', message: 'Failed to create record' } }, { status: 400 })
  }

  if (table_ids && Array.isArray(table_ids) && table_ids.length > 0) {
    const tableRows = table_ids.map((table_id: string) => ({
      reservation_id: data.id,
      table_id,
    }))
    const { error: tableError } = await supabase
      .from('reservation_tables')
      .insert(tableRows)

    if (tableError) {
      await supabase.from('reservations').delete().eq('id', data.id)
      return NextResponse.json({ error: { code: 'TABLE_ERROR', message: 'Table operation failed' } }, { status: 400 })
    }
  }

  return NextResponse.json({ data }, { status: 201 })
}
