'use client'

import type { InventoryForecast } from '@/types/enterprise'
import { useLanguage } from '@/hooks/use-language'

interface DemandChartProps {
  data: InventoryForecast[]
  loading?: boolean
}

export function DemandChart({ data, loading }: DemandChartProps) {
  const { t } = useLanguage()

  if (loading) {
    return (
      <div className="h-40 bg-muted animate-pulse rounded" />
    )
  }

  if (data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
        {t('forecast.noData')}
      </div>
    )
  }

  const maxQty = Math.max(...data.map(d => d.predicted_quantity), 1)
  const barHeight = 120

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1 h-32" style={{ height: barHeight }}>
        {data.map((d, i) => {
          const height = (d.predicted_quantity / maxQty) * (barHeight - 10) + 10
          const isHighRisk = d.stockout_risk === 'critical' || d.stockout_risk === 'high'
          return (
            <div
              key={d.id}
              className={`flex-1 rounded-t transition-all duration-200 ${
                isHighRisk
                  ? 'bg-red-400 dark:bg-red-600'
                  : d.stockout_risk === 'medium'
                  ? 'bg-yellow-400 dark:bg-yellow-600'
                  : 'bg-green-400 dark:bg-green-600'
              }`}
              style={{ height: `${height}px` }}
              title={`${new Date(d.forecast_date).toLocaleDateString()}: ${Number(d.predicted_quantity).toFixed(2)}`}
            />
          )
        })}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{data[0] ? new Date(data[0].forecast_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}</span>
        <span>{data.length > 0 ? new Date(data[data.length - 1]!.forecast_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}</span>
      </div>
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> {t('forecast.low')}/{t('forecast.medium')}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> {t('forecast.high')}/{t('forecast.critical')}</span>
      </div>
    </div>
  )
}
