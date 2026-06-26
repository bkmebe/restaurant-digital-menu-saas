'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/format'
import { Star } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import type { PopularItem } from '@/hooks/use-owner-analytics'

interface Props {
  items: PopularItem[]
  t: (key: string, params?: Record<string, string | number>) => string
}

export function PopularItemsCard({ items, t }: Props) {
  return (
    <Card className="border-border/60 bg-card/85 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Star className="h-5 w-5 text-amber-500" />
          {t('owner.popular.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState icon={<Star className="h-8 w-8" />} title={t('owner.popular.noData')} />
        ) : (
          <div className="space-y-1">
            {items.map((item, i) => (
              <div key={item.menu_item_id} className="flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="font-medium text-sm">{item.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{t('owner.popular.sold', { count: item.total_quantity })}</span>
                  <span className="font-medium text-foreground">{formatCurrency(item.total_revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
