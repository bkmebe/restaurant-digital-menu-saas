'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { KDSOrder, KDSOrderItem } from '@/types/kitchen'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { Clock, CookingPot, Check, ChefHat, AlertTriangle } from 'lucide-react'

interface KDSOrderCardProps {
  order: KDSOrder
  onAccept: (orderId: string) => void
  onUpdateStatus: (orderId: string, itemId: string, status: string) => void
}

function ElapsedTimer({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    const update = () => {
      const diff = Date.now() - new Date(startTime).getTime()
      const mins = Math.floor(diff / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      setElapsed(`${mins}:${secs.toString().padStart(2, '0')}`)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  const diff = Date.now() - new Date(startTime).getTime()
  const mins = Math.floor(diff / 60000)
  const isWarning = mins > 10
  const isCritical = mins > 20

  return (
    <span className={cn('font-mono text-sm flex items-center gap-1', isCritical ? 'text-red-500' : isWarning ? 'text-yellow-500' : 'text-green-500')}>
      <Clock className="h-3 w-3" />
      {elapsed}
      {isCritical && <AlertTriangle className="h-3 w-3" />}
    </span>
  )
}

export function KDSOrderCard({ order, onAccept, onUpdateStatus }: KDSOrderCardProps) {
  const { locale } = useLanguage()

  const pendingItems = order.items.filter(i => i.prep_status === 'new')
  const preparingItems = order.items.filter(i => i.prep_status === 'preparing')
  const readyItems = order.items.filter(i => i.prep_status === 'ready')

  const getItemName = (item: KDSOrderItem) =>
    locale === 'am' ? item.menu_item.name_am : locale === 'om' ? item.menu_item.name_om : item.menu_item.name

  const hasSpecialRequests = order.items.some(i => i.special_requests) || order.special_instructions

  return (
    <Card className={cn(
      'border-l-4',
      order.priority > 0 ? 'border-l-red-500' : 'border-l-blue-500',
      order.status === 'pending' && 'animate-pulse border-l-yellow-500'
    )}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">Table {order.table?.table_number || '?'}</span>
              <Badge variant={order.priority > 0 ? 'destructive' : 'secondary'}>
                {order.status}
              </Badge>
              {hasSpecialRequests && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
            </div>
            <span className="text-sm text-muted-foreground">#{order.id.slice(0, 8)}</span>
            {order.customer_name && <span className="text-sm text-muted-foreground ml-2">· {order.customer_name}</span>}
          </div>
          {order.accepted_at && <ElapsedTimer startTime={order.accepted_at} />}
        </div>

        {/* Pending items */}
        {pendingItems.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-yellow-600 uppercase">New</p>
            {pendingItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                <div>
                  <span className="font-medium text-sm">{getItemName(item)} x{item.quantity}</span>
                  {item.special_requests && <p className="text-xs text-muted-foreground italic">{item.special_requests}</p>}
                </div>
                <Button size="sm" variant="outline" onClick={() => onUpdateStatus(order.id, item.id, 'preparing')}>
                  <CookingPot className="h-3 w-3 mr-1" /> Start
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Preparing items */}
        {preparingItems.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-blue-600 uppercase">Preparing</p>
            {preparingItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                <div>
                  <span className="font-medium text-sm">{getItemName(item)} x{item.quantity}</span>
                  {item.prep_started_at && <ElapsedTimer startTime={item.prep_started_at} />}
                </div>
                <Button size="sm" variant="outline" onClick={() => onUpdateStatus(order.id, item.id, 'ready')}>
                  <Check className="h-3 w-3 mr-1" /> Done
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Ready items */}
        {readyItems.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-green-600 uppercase">Ready</p>
            {readyItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-green-50 rounded">
                <span className="font-medium text-sm">{getItemName(item)} x{item.quantity}</span>
                <Badge variant="success">Ready</Badge>
              </div>
            ))}
          </div>
        )}

        {order.special_instructions && (
          <p className="text-xs text-muted-foreground italic border-t pt-2">{order.special_instructions}</p>
        )}

        {order.status === 'pending' && (
          <Button className="w-full" onClick={() => onAccept(order.id)}>
            <ChefHat className="h-4 w-4 mr-2" /> Accept Order
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
