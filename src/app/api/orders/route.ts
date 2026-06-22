import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/utils/auth-guard'

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const supabase = await createServerSupabaseClient()
  const body = await request.json()

  const { table_id, customer_name, special_instructions, items } = body

  if (!table_id || !items || items.length === 0) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'table_id and items are required' } }, { status: 400 })
  }

  const { data: table } = await supabase.from('tables').select('restaurant_id').eq('id', table_id).single()
  if (!table) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Table not found' } }, { status: 404 })
  }

  const { data: order, error: orderError } = await supabase.from('orders').insert({
    restaurant_id: table.restaurant_id,
    table_id,
    customer_name: customer_name || 'Guest',
    status: 'pending',
    total_amount: 0,
    special_instructions,
  }).select().single()

  if (orderError) {
    return NextResponse.json({ error: { code: 'ORDER_ERROR', message: orderError.message } }, { status: 400 })
  }

  let total = 0
  for (const item of items) {
    const { data: menuItem } = await supabase.from('menu_items').select('price').eq('id', item.menu_item_id).single()
    const unitPrice = menuItem?.price || 0
    const subtotal = Number(unitPrice) * item.quantity
    total += subtotal

    const { error: itemError } = await supabase.from('order_items').insert({
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      unit_price: unitPrice,
      subtotal,
      special_requests: item.special_requests,
    })

    if (itemError) {
      return NextResponse.json({ error: { code: 'ITEM_ERROR', message: itemError.message } }, { status: 400 })
    }
  }

  await supabase.from('orders').update({ total_amount: total }).eq('id', order.id)

  return NextResponse.json({
    data: { ...order, total_amount: total },
    message: 'Order placed successfully',
  }, { status: 201 })
}

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { searchParams } = new URL(request.url)
  const tableId = searchParams.get('tableId')
  const orderId = searchParams.get('orderId')

  if (orderId) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*, menu_item:menu_items(*)), table:tables(*)')
      .eq('id', orderId)
      .single()

    if (error) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Order not found' } }, { status: 404 })
    return NextResponse.json({ data })
  }

  if (tableId) {
    const { data } = await supabase
      .from('orders')
      .select('*, items:order_items(*, menu_item:menu_items(*))')
      .eq('table_id', tableId)
      .neq('status', 'completed')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })

    return NextResponse.json({ data: data || [] })
  }

  return NextResponse.json({ error: { code: 'VALIDATION', message: 'tableId or orderId required' } }, { status: 400 })
}
