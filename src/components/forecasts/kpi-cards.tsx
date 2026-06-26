'use client'

import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, TrendingDown, Package, RefreshCw } from 'lucide-react'

interface KPICardsProps {
  totalForecasts: number
  criticalCount: number
  highCount: number
  reorderRecommended: number
  loading?: boolean
}

export function KPICards({ totalForecasts, criticalCount, highCount, reorderRecommended, loading }: KPICardsProps) {
  const { t } = useLanguage()

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-16 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const items = [
    {
      label: t('forecast.kpi.total'),
      value: totalForecasts,
      icon: <Package className="h-5 w-5" />,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: t('forecast.kpi.highRisk'),
      value: highCount,
      icon: <TrendingDown className="h-5 w-5" />,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-100 dark:bg-orange-900/30',
    },
    {
      label: t('forecast.kpi.critical'),
      value: criticalCount,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/30',
    },
    {
      label: t('forecast.kpi.reorder'),
      value: reorderRecommended,
      icon: <RefreshCw className="h-5 w-5" />,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-900/30',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map(item => (
        <Card key={item.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${item.bg}`}>
                <span className={item.color}>{item.icon}</span>
              </div>
              <div>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
