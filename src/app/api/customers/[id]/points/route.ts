import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole } from '@/lib/utils/tenant'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'waiter')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const { id } = await params

  const { data, error } = await supabase
    .from('reward_points')
    .select('*')
    .eq('customer_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: { code: 'QUERY_ERROR', message: 'Failed to query data' } }, { status: 400 })
  }

  const balance = Array.isArray(data)
    ? data.reduce((sum: number, rp: { points: number }) => sum + rp.points, 0)
    : 0

  return NextResponse.json({ data: data || [], balance })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'waiter')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId
  const { id } = await params

  const body = await request.json()
  const { points, source, reference_type, reference_id, description } = body

  if (!points || points === 0) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'Points must be non-zero' } }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('reward_points')
    .insert({
      restaurant_id: restaurantId,
      customer_id: id,
      points,
      source: source || 'adjustment',
      reference_type: reference_type || 'manual',
      reference_id: reference_id || null,
      description: description || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'INSERT_ERROR', message: 'Failed to create record' } }, { status: 400 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
