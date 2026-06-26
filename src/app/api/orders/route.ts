import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/utils/tenant'

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'Invalid JSON body' } }, { status: 400 })
  }

  const { table_id, customer_name, special_instructions, items } = body as {
    table_id?: string
    customer_name?: string
    special_instructions?: string
    items?: Array<{ menu_item_id: string; quantity: number; special_requests?: string }>
  }

  if (!table_id || !items || items.length === 0) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'table_id and items are required' } }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

  const { data: table } = await supabase.from('tables').select('restaurant_id').eq('id', table_id).single()
  if (!table) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Table not found' } }, { status: 404 })
  }

  const tenant = await requireTenant()
  const userId = tenant instanceof NextResponse ? null : (tenant as { userId: string }).userId

  const { data: order, error: orderError } = await supabase.from('orders').insert({
    restaurant_id: table.restaurant_id,
    table_id,
    customer_name: customer_name || 'Guest',
    status: 'pending',
    total_amount: 0,
    special_instructions,
    created_by: userId,
  }).select().single()

  if (orderError) {
    return NextResponse.json({ error: { code: 'ORDER_ERROR', message: 'Failed to process order' } }, { status: 400 })
  }

  const menuItemIds = items.map(i => i.menu_item_id)
  const { data: menuItems, error: menuError } = await supabase
    .from('menu_items')
    .select('id, price')
    .in('id', menuItemIds)

  if (menuError) {
    return NextResponse.json({ error: { code: 'MENU_ERROR', message: 'Menu operation failed' } }, { status: 400 })
  }

  const priceMap = new Map(menuItems?.map(m => [m.id, Number(m.price)]) ?? [])

  const orderItemsData = items.map(item => {
    const unitPrice = priceMap.get(item.menu_item_id) || 0
    const subtotal = unitPrice * item.quantity
    return {
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      unit_price: unitPrice,
      subtotal,
      special_requests: item.special_requests,
    }
  })

  const total = orderItemsData.reduce((sum, item) => sum + item.subtotal, 0)

  const { error: itemError } = await supabase.from('order_items').insert(orderItemsData)

  if (itemError) {
    return NextResponse.json({ error: { code: 'ITEM_ERROR', message: 'Failed to process order item' } }, { status: 400 })
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

  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    )
  }

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
