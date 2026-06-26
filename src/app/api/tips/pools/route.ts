import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole, requireMutate } from '@/lib/utils/tenant'

export async function GET(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'manager')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId
  if (!restaurantId) return NextResponse.json({ data: [], total: 0 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20')))
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('tip_pools')
    .select('*, tips:staff_tips(*)', { count: 'exact' })
    .eq('restaurant_id', restaurantId)
    .order('pool_period_start', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (status) query = query.eq('status', status)
  if (from) query = query.gte('pool_period_start', from)
  if (to) query = query.lte('pool_period_end', to)

  const { data, count } = await query
  return NextResponse.json({ data: data || [], total: count || 0, page, pageSize })
}

export async function POST(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'manager')
  if (roleError) return roleError
  const mutateError = requireMutate(tenant)
  if (mutateError) return mutateError

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId

  const body = await request.json()
  const { name, description, pool_period_start, pool_period_end, distribution_method } = body

  if (!name || !pool_period_start || !pool_period_end) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'name, pool_period_start, pool_period_end are required' } }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tip_pools')
    .insert({
      restaurant_id: restaurantId,
      name,
      description: description || null,
      pool_period_start,
      pool_period_end,
      distribution_method: distribution_method || 'equal_split',
      total_collected: 0,
      total_distributed: 0,
      status: 'open',
      created_by: tenant.userId,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Database error occurred' } }, { status: 500 })
  }
  return NextResponse.json({ data }, { status: 201 })
}
