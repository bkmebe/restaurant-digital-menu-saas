'use client'

import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { DollarSign, TrendingUp, ShoppingCart, Users, Building2, AlertTriangle } from 'lucide-react'
import type { OwnerOverview } from '@/hooks/use-owner-analytics'

interface Props {
  overview: OwnerOverview
  t: (key: string, params?: Record<string, string | number>) => string
}

const cards = [
  {
    key: 'revenueToday',
    labelKey: 'owner.kpi.revenueToday',
    value: (o: OwnerOverview) => formatCurrency(o.revenueToday),
    trend: (o: OwnerOverview) => o.ordersToday,
    trendKey: 'owner.kpi.ordersToday',
    icon: DollarSign,
    accent: 'from-emerald-500/20 to-emerald-500/5',
    iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'revenueMonth',
    labelKey: 'owner.kpi.revenueMonth',
    value: (o: OwnerOverview) => formatCurrency(o.revenueMonth),
    trend: (o: OwnerOverview) => `${((o.revenueMonth / (o.revenueToday || 1))).toFixed(1)}x`,
    trendKey: 'owner.kpi.monthToDate',
    icon: TrendingUp,
    accent: 'from-blue-500/20 to-blue-500/5',
    iconBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  },
  {
    key: 'totalOrders',
    labelKey: 'owner.kpi.totalOrders',
    value: (o: OwnerOverview) => String(o.totalOrders),
    trend: (o: OwnerOverview) => o.ordersMonth,
    trendKey: 'owner.kpi.thisMonth',
    icon: ShoppingCart,
    accent: 'from-purple-500/20 to-purple-500/5',
    iconBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  },
  {
    key: 'activeEmployees',
    labelKey: 'owner.kpi.activeEmployees',
    value: (o: OwnerOverview) => String(o.activeEmployees),
    trend: (o: OwnerOverview) => o.menuItemCount,
    trendKey: 'owner.kpi.menuItems',
    icon: Users,
    accent: 'from-amber-500/20 to-amber-500/5',
    iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  },
  {
    key: 'branches',
    labelKey: 'owner.kpi.branches',
    value: (o: OwnerOverview) => String(o.branchCount),
    trend: (o: OwnerOverview) => o.averageOrderValue,
    trendKey: 'owner.kpi.avgOrderValue',
    icon: Building2,
    accent: 'from-indigo-500/20 to-indigo-500/5',
    iconBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
  },
  {
    key: 'lowStock',
    labelKey: 'owner.kpi.lowStock',
    value: (o: OwnerOverview) => String(o.lowStockCount),
    trend: (o: OwnerOverview) => o.lowStockCount,
    trendKey: '',
    icon: AlertTriangle,
    accent: (o: OwnerOverview) => o.lowStockCount > 0 ? 'from-red-500/20 to-red-500/5' : 'from-green-500/20 to-green-500/5',
    iconBg: (o: OwnerOverview) => o.lowStockCount > 0 ? 'bg-red-500/15 text-red-600 dark:text-red-400' : 'bg-green-500/15 text-green-600 dark:text-green-400',
  },
]

export function ExecutiveKPICards({ overview, t }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon
        const accent = typeof card.accent === 'function' ? card.accent(overview) : card.accent
        const iconBg = typeof card.iconBg === 'function' ? card.iconBg(overview) : card.iconBg
        const trendVal = typeof card.trend === 'function' ? card.trend(overview) : card.trend

        return (
          <Card key={card.key} className="relative overflow-hidden border-border/60 bg-card/70 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md">
            <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br', accent)} />
            <CardContent className="relative space-y-2 p-4">
              <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', iconBg)}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t(card.labelKey)}</p>
                <p className="text-lg font-semibold leading-tight tracking-tight">{card.value(overview)}</p>
                {card.trendKey && (
                  <p className="text-xs text-muted-foreground/80">
                    {t(card.trendKey)}: {typeof trendVal === 'number' ? formatCurrency(trendVal) : String(trendVal)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
