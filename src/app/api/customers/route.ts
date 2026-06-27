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
  const search = searchParams.get('search')
  const tier = searchParams.get('tier')
  const tag = searchParams.get('tag')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20')))
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
  }
  if (tier) query = query.eq('loyalty_tier', tier)
  if (tag) query = query.contains('tags', [tag])

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
  const { name, phone, email, notes, tags } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'Customer name is required' } }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('customers')
    .insert({
      restaurant_id: restaurantId,
      name: name.trim(),
      phone: phone || null,
      email: email || null,
      notes: notes || null,
      tags: tags || [],
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: { code: 'DUPLICATE', message: 'Customer with this phone or email already exists' } }, { status: 409 })
    }
    return NextResponse.json({ error: { code: 'INSERT_ERROR', message: 'Failed to create record' } }, { status: 400 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
