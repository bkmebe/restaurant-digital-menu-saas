import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole, requireMutate } from '@/lib/utils/tenant'

export async function GET(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId

  if (!restaurantId) {
    return NextResponse.json({ data: [], total: 0 })
  }

  const { searchParams } = new URL(request.url)
  const urgency = searchParams.get('urgency')
  const actioned = searchParams.get('actioned')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20')))
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('reorder_suggestions')
    .select('*, ingredient:ingredients(name, unit, category), preferred_supplier:suppliers(name)', { count: 'exact' })
    .eq('restaurant_id', restaurantId)
    .order('urgency', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (urgency) query = query.eq('urgency', urgency)
  if (actioned === 'true') query = query.eq('is_actioned', true)
  if (actioned === 'false') query = query.eq('is_actioned', false)

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

  const roleError = requireRole(tenant, 'inventory_manager')
  if (roleError) return roleError

  const mutateError = requireMutate(tenant)
  if (mutateError) return mutateError

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId

  if (!restaurantId) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'No restaurant assigned' } }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('generate_reorder_suggestions', {
    p_restaurant_id: restaurantId,
  })

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Failed to generate reorder suggestions' } }, { status: 500 })
  }

  return NextResponse.json({ data: data || [] }, { status: 201 })
}
