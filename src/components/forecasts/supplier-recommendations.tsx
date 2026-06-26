'use client'

import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent } from '@/components/ui/card'
import { Star } from 'lucide-react'

interface SupplierScore {
  id: string
  name: string
  score: number
}

interface SupplierRecommendationsProps {
  suppliers: SupplierScore[]
  loading?: boolean
}

export function SupplierRecommendations({ suppliers, loading }: SupplierRecommendationsProps) {
  const { t } = useLanguage()

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-3">
              <div className="h-10 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (suppliers.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        {t('forecast.noSuppliers')}
      </div>
    )
  }

  const sorted = [...suppliers].sort((a, b) => b.score - a.score)

  return (
    <div className="space-y-2">
      {sorted.map((supplier, index) => (
        <Card key={supplier.id}>
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {index === 0 && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
              <span className="text-sm font-medium">{supplier.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${supplier.score}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-8 text-right">{supplier.score}%</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
