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
  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20')))
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('coupons')
    .select('*', { count: 'exact' })
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (status === 'active') query = query.eq('is_active', true)
  if (status === 'inactive') query = query.eq('is_active', false)
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

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId

  if (!restaurantId) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'No restaurant assigned' } }, { status: 400 })
  }

  const body = await request.json()
  const { code, type, value, min_order_amount, max_discount, usage_limit, usage_per_customer, starts_at, expires_at, description, applicable_customer_tags } = body

  if (!code?.trim() || !type || !value) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'Code, type, and value are required' } }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('coupons')
    .insert({
      restaurant_id: restaurantId,
      code: code.trim().toUpperCase(),
      type,
      value,
      min_order_amount: min_order_amount || 0,
      max_discount: max_discount || null,
      usage_limit: usage_limit || null,
      usage_per_customer: usage_per_customer || 1,
      starts_at: starts_at || new Date().toISOString(),
      expires_at: expires_at || null,
      description: description || null,
      applicable_customer_tags: applicable_customer_tags || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: { code: 'DUPLICATE', message: 'Coupon code already exists' } }, { status: 409 })
    }
    return NextResponse.json({ error: { code: 'INSERT_ERROR', message: 'Failed to create record' } }, { status: 400 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
