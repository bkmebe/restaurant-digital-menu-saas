import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole, requireMutate } from '@/lib/utils/tenant'

export async function GET(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'waiter')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId
  if (!restaurantId) return NextResponse.json({ data: [], total: 0 })

  const { searchParams } = new URL(request.url)
  const employeeId = searchParams.get('employeeId')
  const poolId = searchParams.get('poolId')
  const status = searchParams.get('status')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20')))
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('staff_tips')
    .select('*, employee:employees(id, name, role), confirmed_by_employee:employees!staff_tips_confirmed_by_fkey(id, name)', { count: 'exact' })
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (employeeId) query = query.eq('employee_id', employeeId)
  if (poolId) query = query.eq('tip_pool_id', poolId)
  if (status) query = query.eq('status', status)
  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)

  const { data, count } = await query
  return NextResponse.json({ data: data || [], total: count || 0, page, pageSize })
}

export async function POST(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  let roleError = requireRole(tenant, 'waiter')
  if (roleError) return roleError
  roleError = requireMutate(tenant)
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId
  if (!restaurantId) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'No restaurant assigned' } }, { status: 400 })
  }

  const body = await request.json()
  const { employee_id, tip_type, amount, order_id, tip_pool_id, notes } = body

  if (!employee_id || !tip_type || !amount) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'employee_id, tip_type, and amount are required' } }, { status: 400 })
  }

  if (!['cash', 'mobile', 'manual'].includes(tip_type)) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'Invalid tip type' } }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('staff_tips')
    .insert({
      restaurant_id: restaurantId,
      employee_id,
      order_id: order_id || null,
      tip_pool_id: tip_pool_id || null,
      tip_type,
      amount,
      notes: notes || null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Database error occurred' } }, { status: 500 })
  }
  return NextResponse.json({ data }, { status: 201 })
}
