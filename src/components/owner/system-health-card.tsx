'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, CheckCircle, AlertTriangle, Package } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { InventorySummary } from '@/hooks/use-owner-analytics'
import type { OwnerOverview } from '@/hooks/use-owner-analytics'

interface Props {
  overview: OwnerOverview
  inventory: InventorySummary | null
  t: (key: string, params?: Record<string, string | number>) => string
}

export function SystemHealthCard({ overview, inventory, t }: Props) {
  const healthItems = [
    {
      label: t('owner.health.totalRevenue'),
      status: overview.totalRevenue > 0 ? 'healthy' : 'neutral',
      detail: t('owner.health.revenueGenerating'),
    },
    {
      label: t('owner.health.activeOrders'),
      status: overview.ordersToday > 0 ? 'healthy' : 'neutral',
      detail: t('owner.health.ordersPlaced', { count: overview.ordersToday }),
    },
    {
      label: t('owner.health.branches'),
      status: overview.branchCount > 0 ? 'healthy' : 'warning',
      detail: t('owner.health.activeBranches', { count: overview.branchCount }),
    },
    {
      label: t('owner.health.inventory'),
      status: overview.lowStockCount > 0 ? 'warning' : 'healthy',
      detail: overview.lowStockCount > 0
        ? t('owner.health.lowStockAlerts', { count: overview.lowStockCount })
        : t('owner.health.allStocked'),
    },
  ]

  return (
    <Card className="border-border/60 bg-card/85 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5 text-blue-500" />
          {t('owner.health.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {healthItems.map((item) => (
            <div key={item.label} className="flex items-start gap-3 rounded-lg border border-border/50 p-3">
              <div className={cn(
                'mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg',
                item.status === 'healthy' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'
              )}>
                {item.status === 'healthy' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
        {inventory && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
            <Package className="h-4 w-4" />
            {t('owner.health.ingredients', { count: inventory.totalIngredients })} &middot; {t('owner.health.inventoryValue', { value: inventory.totalValue.toFixed(0) })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
