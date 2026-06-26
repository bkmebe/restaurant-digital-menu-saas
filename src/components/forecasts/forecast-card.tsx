'use client'

import type { InventoryForecast } from '@/types/enterprise'
import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'

interface ForecastCardProps {
  forecast: InventoryForecast
}

const riskColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export function ForecastCard({ forecast }: ForecastCardProps) {
  const { t } = useLanguage()
  const ingredient = forecast.ingredient as { name: string; unit: string } | undefined

  const riskIcon = forecast.stockout_risk === 'critical' || forecast.stockout_risk === 'high'
    ? <TrendingDown className="h-4 w-4" />
    : forecast.stockout_risk === 'medium'
    ? <Minus className="h-4 w-4" />
    : <TrendingUp className="h-4 w-4" />

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-medium text-sm">{ingredient?.name || forecast.ingredient_id}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(forecast.forecast_date).toLocaleDateString()}
            </p>
          </div>
          <Badge className={`${riskColors[forecast.stockout_risk] || riskColors.low} flex items-center gap-1`}>
            {riskIcon}
            {t(`forecast.risk.${forecast.stockout_risk}`)}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs mt-3">
          <div>
            <p className="text-muted-foreground">{t('forecast.predicted')}</p>
            <p className="font-medium">{Number(forecast.predicted_quantity).toFixed(2)} {ingredient?.unit || ''}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('forecast.confidence')}</p>
            <p className="font-medium">{forecast.confidence_score !== null ? `${(forecast.confidence_score * 100).toFixed(0)}%` : '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('forecast.dailyUsage')}</p>
            <p className="font-medium">{forecast.daily_usage_rate !== null ? Number(forecast.daily_usage_rate).toFixed(2) : '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('forecast.leadTime')}</p>
            <p className="font-medium">{forecast.lead_time_days !== null ? `${forecast.lead_time_days}d` : '-'}</p>
          </div>
        </div>
        {forecast.reorder_recommended && (
          <div className="mt-3 pt-2 border-t">
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
              {t('forecast.reorderRecommended')} {forecast.recommended_order_quantity !== null ? `(${Number(forecast.recommended_order_quantity).toFixed(2)})` : ''}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
