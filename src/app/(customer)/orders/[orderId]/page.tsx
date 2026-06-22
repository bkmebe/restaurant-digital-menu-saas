'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/hooks/use-language'
import { Order, OrderItem } from '@/types/database'
import { OrderTimeline } from '@/types/order'
import { OrderTimelineView } from '@/components/cart/order-timeline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateTime } from '@/lib/utils/format'
import { ArrowLeft, Check } from 'lucide-react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-blue-100 text-blue-800',
  preparing: 'bg-purple-100 text-purple-800',
  ready: 'bg-green-100 text-green-800',
  delivered: 'bg-teal-100 text-teal-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function OrderTrackingPage() {
  const params = useParams()
  const { t } = useLanguage()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('orders').select('*, items:order_items(*, menu_item:menu_items(*))').eq('id', params.orderId).single()
      .then(({ data }) => {
        if (data) setOrder(data as unknown as Order)
        setLoading(false)
      })

    // Real-time subscription
    const channel = supabase.channel(`order-${params.orderId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${params.orderId}` },
        (payload) => {
          setOrder(prev => prev ? { ...prev, ...payload.new as Order } : null)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [params.orderId])

  const handleComplete = async () => {
    const supabase = createClient()
    await supabase.from('orders').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', params.orderId)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 max-w-lg mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Order not found</p>
      </div>
    )
  }

  const timeline: OrderTimeline = {
    created_at: order.created_at,
    accepted_at: order.accepted_at || undefined,
    preparing_at: order.preparing_at || undefined,
    ready_at: order.ready_at || undefined,
    delivered_at: order.delivered_at || undefined,
    completed_at: order.completed_at || undefined,
    cancelled_at: order.cancelled_at || undefined,
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/menu/${order.table_id}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Order #{order.id.slice(0, 8)}</h1>
            <p className="text-sm text-muted-foreground">{formatDateTime(order.created_at)}</p>
          </div>
          <Badge className={`${statusColors[order.status] || ''} ml-auto`}>{order.status}</Badge>
        </div>

        <Card>
          <CardHeader><CardTitle>Order Status</CardTitle></CardHeader>
          <CardContent>
            <OrderTimelineView timeline={timeline} status={order.status} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Items ({order.items?.length || 0})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(order.items as OrderItem[])?.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium">{item.menu_item?.name || 'Item'} x{item.quantity}</p>
                  {item.special_requests && (
                    <p className="text-xs text-muted-foreground italic">{item.special_requests}</p>
                  )}
                </div>
                <span className="font-semibold">{formatCurrency(Number(item.subtotal))}</span>
              </div>
            ))}
            {order.special_instructions && (
              <div className="pt-2 text-sm text-muted-foreground">
                <span className="font-medium">Notes: </span>{order.special_instructions}
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t font-bold">
              <span>Total</span>
              <span>{formatCurrency(Number(order.total_amount))}</span>
            </div>
          </CardContent>
        </Card>

        {order.status === 'delivered' && (
          <Button className="w-full gap-2" onClick={handleComplete}>
            <Check className="h-4 w-4" /> Mark as Completed
          </Button>
        )}
      </div>
    </div>
  )
}
