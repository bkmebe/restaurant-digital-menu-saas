'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/format'
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface Props {
  revenueGrowth: number
  orderGrowth: number
  revenueMonth: number
  ordersMonth: number
  t: (key: string, params?: Record<string, string | number>) => string
}

export function OrganizationGrowthCard({ revenueGrowth, orderGrowth, revenueMonth, ordersMonth, t }: Props) {
  const metrics = [
    {
      label: t('organization.revenueGrowth'),
      value: `${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth.toFixed(1)}%`,
      amount: formatCurrency(revenueMonth),
      isPositive: revenueGrowth >= 0,
    },
    {
      label: t('organization.orderGrowth'),
      value: `${orderGrowth >= 0 ? '+' : ''}${orderGrowth.toFixed(1)}%`,
      amount: String(ordersMonth),
      isPositive: orderGrowth >= 0,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('organization.growthMetrics')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {metrics.map((m, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{m.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{m.amount}</span>
              </div>
            </div>
            <div className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium',
              m.isPositive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
            )}>
              {m.isPositive ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
              <span>{m.value}</span>
              <span className="text-xs opacity-70">{t('organization.vsLastMonth')}</span>
            </div>
          </div>
        ))}
        <div className="rounded-lg bg-muted/50 p-4">
          <div className="flex items-center gap-2 text-sm">
            {revenueGrowth >= 0 && orderGrowth >= 0 ? (
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500" />
            )}
            <span className="text-muted-foreground">
              {revenueGrowth >= 0
                ? t('organization.positiveOutlook')
                : t('organization.negativeOutlook')}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
