'use client'

import { useLanguage } from '@/hooks/use-language'
import { OrderTimeline } from '@/types/order'
import { formatDateTime } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { Check, Clock, CookingPot, Package, Truck, X, Ban } from 'lucide-react'

interface OrderTimelineProps {
  timeline: OrderTimeline
  status: string
}

const steps = [
  { key: 'pending', label: 'Order Placed', icon: Clock },
  { key: 'accepted', label: 'Accepted', icon: Check },
  { key: 'preparing', label: 'Preparing', icon: CookingPot },
  { key: 'ready', label: 'Ready', icon: Package },
  { key: 'delivered', label: 'Delivered', icon: Truck },
  { key: 'completed', label: 'Completed', icon: Check },
]

const statusOrder = ['pending', 'accepted', 'preparing', 'ready', 'delivered', 'completed', 'cancelled']

export function OrderTimelineView({ timeline, status }: OrderTimelineProps) {
  const { t } = useLanguage()
  const currentIndex = statusOrder.indexOf(status)

  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
        <Ban className="h-5 w-5 text-red-500" />
        <div>
          <p className="font-medium text-red-700">Order Cancelled</p>
          {timeline.cancelled_at && <p className="text-sm text-red-500">{formatDateTime(timeline.cancelled_at)}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {steps.map((step, idx) => {
        const stepIndex = statusOrder.indexOf(step.key)
        const isComplete = stepIndex <= currentIndex
        const isCurrent = step.key === status
        const Icon = step.icon

        return (
          <div key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center border-2',
                isComplete ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30 text-muted-foreground/50'
              )}>
                <Icon className="h-4 w-4" />
              </div>
              {idx < steps.length - 1 && (
                <div className={cn('w-0.5 h-8', isComplete ? 'bg-primary' : 'bg-muted-foreground/20')} />
              )}
            </div>
            <div className={cn('pb-6', isCurrent && 'font-medium')}>
              <p className="text-sm">{step.label}</p>
              <p className="text-xs text-muted-foreground">
                {timeline[`${step.key}_at` as keyof OrderTimeline]
                  ? formatDateTime(timeline[`${step.key}_at` as keyof OrderTimeline]!)
                  : isCurrent ? 'In progress...' : ''}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
