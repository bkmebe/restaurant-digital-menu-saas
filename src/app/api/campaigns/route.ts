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

  if (!restaurantId) {
    return NextResponse.json({ data: [], total: 0 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20')))
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('marketing_campaigns')
    .select('*', { count: 'exact' })
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (status) query = query.eq('status', status)
  if (type) query = query.eq('type', type)

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
  const { name, type, channel, content, target_customer_tags, scheduled_at } = body

  if (!name?.trim() || !type || !content?.trim()) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'Name, type, and content are required' } }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('marketing_campaigns')
    .insert({
      restaurant_id: restaurantId,
      name: name.trim(),
      type,
      channel: channel || 'sms',
      content,
      target_customer_tags: target_customer_tags || [],
      status: scheduled_at ? 'scheduled' : 'draft',
      scheduled_at: scheduled_at || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'INSERT_ERROR', message: 'Failed to create record' } }, { status: 400 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
