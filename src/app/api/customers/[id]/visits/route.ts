import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole } from '@/lib/utils/tenant'
import { calculateLoyaltyTier } from '@/lib/utils/crm'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'waiter')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const { id } = await params

  const { data, error } = await supabase
    .from('visit_history')
    .select('*')
    .eq('customer_id', id)
    .order('visit_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: { code: 'QUERY_ERROR', message: 'Failed to query data' } }, { status: 400 })
  }

  return NextResponse.json({ data: data || [] })
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
  const { order_id, visit_date, amount_spent, notes } = body

  if (!amount_spent && amount_spent !== 0) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'Amount spent is required' } }, { status: 400 })
  }

  const { data: visitData, error: visitError } = await supabase
    .from('visit_history')
    .insert({
      restaurant_id: restaurantId,
      customer_id: id,
      order_id: order_id || null,
      visit_date: visit_date || new Date().toISOString().split('T')[0],
      amount_spent,
      notes: notes || null,
    })
    .select()
    .single()

  if (visitError) {
    return NextResponse.json({ error: { code: 'INSERT_ERROR', message: 'Failed to create record' } }, { status: 400 })
  }

  const { data: customer } = await supabase
    .from('customers')
    .select('total_visits, total_spent')
    .eq('id', id)
    .single()

  if (customer) {
    const newVisits = (customer.total_visits || 0) + 1
    const newSpent = (parseFloat(customer.total_spent?.toString() || '0')) + amount_spent

    const newTier = calculateLoyaltyTier(newSpent)

    await supabase
      .from('customers')
      .update({
        total_visits: newVisits,
        total_spent: newSpent,
        loyalty_tier: newTier,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
  }

  return NextResponse.json({ data: visitData }, { status: 201 })
}
