'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { KDSOrder, KDSOrderItem } from '@/types/kitchen'

export function useKDS(restaurantId?: string) {
  const [orders, setOrders] = useState<KDSOrder[]>([])
  const [loading, setLoading] = useState(true)
  const audioRef = useRef<{ play: () => Promise<void> } | null>(null)
  const prevCountRef = useRef(0)

  const fetchOrders = useCallback(async () => {
    if (!restaurantId) {
      setLoading(false)
      return
    }
    const supabase = createClient()
    const { data } = await supabase
      .from('orders')
      .select('*, items:order_items(*, menu_item:menu_items(*)), table:tables(*)')
      .eq('restaurant_id', restaurantId)
      .in('status', ['pending', 'accepted', 'preparing', 'ready'])
      .order('created_at', { ascending: false })

    if (data) {
      const kdsOrders = data as unknown as KDSOrder[]
      if (prevCountRef.current > 0 && kdsOrders.length > prevCountRef.current) {
        audioRef.current?.play().catch(() => {})
      }
      prevCountRef.current = kdsOrders.length
      setOrders(kdsOrders)
    }
    setLoading(false)
  }, [restaurantId])

  useEffect(() => {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    audioRef.current = {
      play: () => {
        const osc = audioCtx.createOscillator()
        const gain = audioCtx.createGain()
        osc.connect(gain)
        gain.connect(audioCtx.destination)
        osc.frequency.value = 880
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3)
        osc.start()
        osc.stop(audioCtx.currentTime + 0.3)
        return Promise.resolve()
      },
    } as HTMLAudioElement
    fetchOrders()

    if (!restaurantId) return
    const supabase = createClient()
    const channel = supabase.channel('kds-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
        () => fetchOrders()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'order_items', filter: `order_id=in.(${orders.map(o => o.id).join(',')})` },
        () => fetchOrders()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [restaurantId, fetchOrders])

  const updateItemPrepStatus = async (orderId: string, itemId: string, status: string) => {
    const supabase = createClient()
    const updateData: Record<string, unknown> = { prep_status: status }
    if (status === 'preparing') updateData.prep_started_at = new Date().toISOString()
    if (status === 'ready') updateData.prep_completed_at = new Date().toISOString()

    await supabase.from('order_items').update(updateData).eq('id', itemId)

    if (status === 'ready') {
      const { data: items } = await supabase.from('order_items').select('prep_status').eq('order_id', orderId)
      const allReady = items?.every(i => i.prep_status === 'ready' || i.prep_status === 'delivered')
      if (allReady) {
        await supabase.from('orders').update({ status: 'ready', ready_at: new Date().toISOString() }).eq('id', orderId)
      }
    }
  }

  const acceptOrder = async (orderId: string) => {
    const supabase = createClient()
    await supabase.from('orders').update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      estimated_prep_time: 15,
    }).eq('id', orderId)
  }

  return { orders, loading, fetchOrders, updateItemPrepStatus, acceptOrder }
}
