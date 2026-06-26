'use client'

import type { ReorderSuggestion } from '@/types/enterprise'
import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'

interface ReorderSuggestionsProps {
  data: ReorderSuggestion[]
  loading: boolean
  onAction: (id: string) => void
  actionLoading?: string | null
}

const urgencyColors: Record<string, string> = {
  normal: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  soon: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  critical: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

const urgencyIcons: Record<string, React.ReactNode> = {
  normal: <Package className="h-4 w-4" />,
  soon: <Clock className="h-4 w-4" />,
  critical: <AlertTriangle className="h-4 w-4" />,
  overdue: <AlertTriangle className="h-4 w-4" />,
}

export function ReorderSuggestions({ data, loading, onAction, actionLoading }: ReorderSuggestionsProps) {
  const { t } = useLanguage()

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-16 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>{t('forecast.noReorderSuggestions')}</p>
      </div>
    )
  }

  const sorted = [...data].sort((a, b) => {
    const urgencyOrder: Record<string, number> = { overdue: 0, critical: 1, soon: 2, normal: 3 }
    return (urgencyOrder[a.urgency] ?? 99) - (urgencyOrder[b.urgency] ?? 99)
  })

  return (
    <div className="space-y-3">
      {sorted.map(suggestion => {
        const ingredient = suggestion.ingredient as { name: string; unit: string } | undefined
        const supplier = suggestion.preferred_supplier as { name: string } | undefined

        return (
          <Card key={suggestion.id} className={suggestion.is_actioned ? 'opacity-60' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{ingredient?.name || suggestion.ingredient_id}</p>
                    <Badge className={urgencyColors[suggestion.urgency] || urgencyColors.normal}>
                      <span className="flex items-center gap-1">
                        {urgencyIcons[suggestion.urgency]}
                        {t(`forecast.urgency.${suggestion.urgency}`)}
                      </span>
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mt-2">
                    <div>
                      <p className="text-muted-foreground">{t('forecast.currentStock')}</p>
                      <p className="font-medium">{Number(suggestion.current_stock).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('forecast.reorderLevel')}</p>
                      <p className="font-medium">{Number(suggestion.reorder_level).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('forecast.suggestedQty')}</p>
                      <p className="font-medium text-green-600 dark:text-green-400">{Number(suggestion.suggested_order_qty).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('forecast.daysUntilStockout')}</p>
                      <p className="font-medium">{suggestion.days_until_stockout}</p>
                    </div>
                  </div>
                  {supplier && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('forecast.preferredSupplier')}: {supplier.name}
                      {suggestion.estimated_cost !== null && ` (${t('forecast.estCost')}: $${Number(suggestion.estimated_cost).toFixed(2)})`}
                    </p>
                  )}
                </div>
                <div className="ml-3 flex-shrink-0">
                  {suggestion.is_actioned ? (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {t('forecast.actioned')}
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAction(suggestion.id)}
                      disabled={actionLoading === suggestion.id}
                    >
                      {actionLoading === suggestion.id ? '...' : t('forecast.action')}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
