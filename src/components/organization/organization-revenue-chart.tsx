'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/format'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { RevenueTrend } from '@/hooks/use-owner-analytics'

interface Props {
  trends: RevenueTrend[]
  trend: number
  totalRevenue: number
  averageDailyRevenue: number
  t: (key: string, params?: Record<string, string | number>) => string
}

export function OrganizationRevenueChart({ trends, trend, totalRevenue, averageDailyRevenue, t }: Props) {
  if (trends.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {t('common.noData')}
        </CardContent>
      </Card>
    )
  }

  const maxRevenue = Math.max(...trends.map(d => d.revenue), 1)
  const isPositive = trend >= 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">{t('organization.revenueTrend')}</CardTitle>
          <p className="text-xs text-muted-foreground">{t('organization.revenueTrendDesc')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{t('organization.avgDaily')}</p>
            <p className="text-sm font-semibold">{formatCurrency(averageDailyRevenue)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{t('organization.total')}</p>
            <p className="text-sm font-semibold">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className={cn('flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', isPositive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600')}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isPositive ? '+' : ''}{trend.toFixed(1)}%
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-[3px] h-40">
          {trends.map((day, i) => (
            <div
              key={day.date}
              className="relative flex-1 group"
            >
              <div
                className="w-full rounded-t-sm bg-primary/60 hover:bg-primary transition-colors cursor-pointer"
                style={{ height: `${(day.revenue / maxRevenue) * 100}%` }}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                <div className="whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs shadow-md">
                  <p className="font-medium">{day.date}</p>
                  <p>{formatCurrency(day.revenue)}</p>
                  <p className="text-muted-foreground">{day.orders} orders</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{trends[0]?.date}</span>
          <span>{trends[trends.length - 1]?.date}</span>
        </div>
      </CardContent>
    </Card>
  )
}

import { cn } from '@/lib/utils/cn'
