import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole, requireMutate } from '@/lib/utils/tenant'

export async function GET() {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'inventory_manager')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId

  if (!restaurantId) {
    return NextResponse.json({ data: [], total: 0 })
  }

  const { data, error } = await supabase
    .from('reorder_suggestions')
    .select('*, ingredient:ingredients(name, name_am, name_om, category), preferred_supplier:suppliers(name)')
    .eq('restaurant_id', restaurantId)
    .eq('is_actioned', false)
    .order('urgency', { ascending: true })
    .order('days_until_stockout', { ascending: true })

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Failed to fetch suggestions' } }, { status: 500 })
  }

  return NextResponse.json({ data: data || [], total: data?.length || 0 })
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
  const profileId = tenant.userId

  if (!restaurantId) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'No restaurant assigned' } }, { status: 400 })
  }

  const { data, error } = await supabase
    .rpc('generate_reorder_suggestions', { p_restaurant_id: restaurantId })

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Failed to generate suggestions' } }, { status: 500 })
  }

  return NextResponse.json({ data: data || [] }, { status: 201 })
}

export async function PUT(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'inventory_manager')
  if (roleError) return roleError

  const mutateError = requireMutate(tenant)
  if (mutateError) return mutateError

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId
  const profileId = tenant.userId

  const body = await request.json()
  const { id } = body as { id?: string }

  if (!id) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'id is required' } }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('reorder_suggestions')
    .update({
      is_actioned: true,
      actioned_at: new Date().toISOString(),
      actioned_by: profileId,
    })
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Suggestion not found' } }, { status: 404 })
  }

  return NextResponse.json({ data })
}
