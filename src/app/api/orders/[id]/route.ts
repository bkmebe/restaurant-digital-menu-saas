import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAuth, requireRole } from '@/lib/utils/auth-guard'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const roleError = requireRole(auth, 'waiter')
  if (roleError) return roleError

  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const body = await request.json()

  const { status, cancellation_reason } = body

  const timestampField = `${status}_at`
  const updateData: Record<string, unknown> = { status }
  updateData[timestampField] = new Date().toISOString()

  if (status === 'cancelled' && cancellation_reason) {
    updateData.cancellation_reason = cancellation_reason
  }

  if (status === 'accepted') {
    const { data: order } = await supabase.from('orders').select('id').eq('id', id).single()
    if (order) {
      const { data: prepResult } = await supabase.rpc('calculate_prep_time', { order_id: id })
      updateData.estimated_prep_time = prepResult || 15
    }
  }

  const { data, error } = await supabase.from('orders').update(updateData).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: { code: 'UPDATE_ERROR', message: error.message } }, { status: 400 })

  return NextResponse.json({ data, message: `Order ${status}` })
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*, menu_item:menu_items(*)), table:tables(*)')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Order not found' } }, { status: 404 })
  return NextResponse.json({ data })
}
