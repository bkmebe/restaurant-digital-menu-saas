'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Order, OrderItem } from '@/types/database'
import { OrderFormData, OrderStatusUpdate } from '@/types/order'

export function useOrders(restaurantId?: string, tableId?: string) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = async () => {
    if (!restaurantId) { setLoading(false); return }
    const supabase = createClient()
    let query = supabase
      .from('orders')
      .select('*, items:order_items(*, menu_item:menu_items(*)), table:tables(*)')
      .eq('restaurant_id', restaurantId)
      .neq('status', 'paid')
      .order('created_at', { ascending: false })

    if (tableId) query = query.eq('table_id', tableId)

    const { data } = await query
    if (data) setOrders(data as unknown as Order[])
    setLoading(false)
  }

  useEffect(() => { fetchOrders() }, [restaurantId, tableId])

  const createOrder = async (orderData: OrderFormData) => {
    const supabase = createClient()
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        table_id: orderData.table_id,
        customer_name: orderData.customer_name,
        special_instructions: orderData.special_instructions,
        total_amount: 0,
      })
      .select()
      .single()

    if (error || !order) throw error || new Error('Failed to create order')

    for (const item of orderData.items) {
      const { data: menuItem } = await supabase
        .from('menu_items')
        .select('price')
        .eq('id', item.menu_item_id)
        .single()

      const unitPrice = menuItem?.price || 0
      const subtotal = unitPrice * item.quantity

      const { error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          unit_price: unitPrice,
          subtotal,
          special_requests: item.special_requests,
        })

      if (itemError) throw itemError
    }

    // Update total
    const { data: items } = await supabase
      .from('order_items')
      .select('subtotal')
      .eq('order_id', order.id)

    const total = items?.reduce((sum, i) => sum + Number(i.subtotal), 0) || 0
    await supabase.from('orders').update({ total_amount: total }).eq('id', order.id)

    await fetchOrders()
  }

  const updateOrderStatus = async (id: string, statusUpdate: OrderStatusUpdate) => {
    const supabase = createClient()
    const { error } = await supabase.from('orders').update(statusUpdate).eq('id', id)
    if (error) throw error
    await fetchOrders()
  }

  return { orders, loading, createOrder, updateOrderStatus, refetch: fetchOrders }
}
