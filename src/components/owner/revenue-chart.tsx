'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/format'
import { TrendingUp } from 'lucide-react'
import type { RevenueTrend, GrowthMetrics } from '@/hooks/use-owner-analytics'

interface Props {
  trends: RevenueTrend[]
  growth: GrowthMetrics
  t: (key: string, params?: Record<string, string | number>) => string
}

export function RevenueChart({ trends, growth, t }: Props) {
  const maxRevenue = Math.max(...trends.map(d => d.revenue), 1)
  const firstDate = trends[0]?.date
  const lastDate = trends[trends.length - 1]?.date

  if (trends.length === 0) {
    return (
      <Card className="border-border/60 bg-card/85 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            {t('owner.chart.revenueTrend')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            {t('owner.chart.noData')}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/60 bg-card/85 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          {t('owner.chart.revenueTrend')}
        </CardTitle>
        <div className="flex items-center gap-4 text-sm">
          <span className={growth.revenueGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'}>
            {growth.revenueGrowth >= 0 ? '+' : ''}{growth.revenueGrowth}% {t('owner.chart.mom')}
          </span>
          <span className="text-muted-foreground">|</span>
          <span className={growth.orderGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'}>
            {growth.orderGrowth >= 0 ? '+' : ''}{growth.orderGrowth}% {t('owner.chart.orders')}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1 h-48">
          {trends.map((day, i) => (
            <div
              key={day.date}
              className="group relative flex-1 flex flex-col items-center justify-end h-full"
            >
              <div
                className="w-full rounded-t bg-gradient-to-t from-blue-500/60 to-blue-400/40 hover:from-blue-500/80 hover:to-blue-400/60 transition-all duration-150 min-h-[4px]"
                style={{ height: `${Math.max((day.revenue / maxRevenue) * 100, 1)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{firstDate ? new Date(firstDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
          <span className="font-medium">{formatCurrency(maxRevenue)}</span>
          <span>{lastDate ? new Date(lastDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
        </div>
      </CardContent>
    </Card>
  )
}
