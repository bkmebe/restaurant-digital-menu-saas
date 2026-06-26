'use client'

import { useState } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { useOrganizationRevenue } from '@/hooks/use-organization-analytics'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { OrganizationRevenueChart } from '@/components/organization/organization-revenue-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/format'
import { TrendingUp, DollarSign, CalendarDays } from 'lucide-react'

const DAY_RANGES = [7, 30, 90] as const

export default function OrganizationRevenuePage() {
  const { t } = useLanguage()
  const [days, setDays] = useState(30)
  const { data, loading, error, refetch } = useOrganizationRevenue(days)

  if (loading) return <LoadingSpinner size="lg" />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-semibold text-red-600">{error}</p>
        <button onClick={refetch} className="mt-4 text-sm text-muted-foreground underline hover:text-foreground">
          {t('common.retry')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur-xl sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              {t('organization.revenueBadge')}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {t('organization.revenueTitle')}
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              {t('organization.revenueSubtitle')}
            </p>
          </div>
          <div className="flex gap-2">
            {DAY_RANGES.map(d => (
              <Button
                key={d}
                variant={days === d ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDays(d)}
              >
                {d}{t('organization.days')}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {data?.summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <CardTitle className="text-xs font-medium text-muted-foreground">{t('organization.totalRevenue')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(data.summary.totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <CardTitle className="text-xs font-medium text-muted-foreground">{t('organization.avgDaily')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(data.summary.averageDailyRevenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <CalendarDays className="h-4 w-4 text-purple-500" />
              <CardTitle className="text-xs font-medium text-muted-foreground">{t('organization.totalOrders')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.summary.totalOrders}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-xs font-medium text-muted-foreground">{t('organization.trend')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${data.summary.trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {data.summary.trend >= 0 ? '+' : ''}{data.summary.trend.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {data && (
        <OrganizationRevenueChart
          trends={data.trends}
          trend={data.summary?.trend || 0}
          totalRevenue={data.summary?.totalRevenue || 0}
          averageDailyRevenue={data.summary?.averageDailyRevenue || 0}
          t={t}
        />
      )}

      {data?.summary?.peakDay && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('organization.peakDay')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{data.summary.peakDay.date}</p>
                <p className="text-xs text-muted-foreground">{t('organization.bestPerformingDay')}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold">{formatCurrency(data.summary.peakDay.revenue)}</p>
                <p className="text-xs text-muted-foreground">{data.summary.peakDay.orders} {t('organization.orders')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
