'use client'

import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { DollarSign, TrendingUp, ShoppingCart, Users, Building2, AlertTriangle, Package } from 'lucide-react'
import type { OrganizationOverview } from '@/hooks/use-organization-analytics'

interface Props {
  overview: OrganizationOverview | null
  t: (key: string, params?: Record<string, string | number>) => string
}

export function OrganizationKPICards({ overview, t }: Props) {
  if (!overview) return null

  const cards = [
    {
      key: 'totalRevenue',
      labelKey: 'organization.totalRevenue',
      value: formatCurrency(overview.totalRevenue),
      icon: DollarSign,
      accent: 'from-emerald-500/20 to-emerald-500/5',
      iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    },
    {
      key: 'revenueToday',
      labelKey: 'organization.revenueToday',
      value: formatCurrency(overview.revenueToday),
      icon: TrendingUp,
      accent: 'from-blue-500/20 to-blue-500/5',
      iconBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    },
    {
      key: 'totalOrders',
      labelKey: 'organization.totalOrders',
      value: String(overview.totalOrders),
      icon: ShoppingCart,
      accent: 'from-purple-500/20 to-purple-500/5',
      iconBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
    },
    {
      key: 'activeEmployees',
      labelKey: 'organization.activeEmployees',
      value: String(overview.activeEmployees),
      icon: Users,
      accent: 'from-amber-500/20 to-amber-500/5',
      iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    },
    {
      key: 'branchCount',
      labelKey: 'organization.branchCount',
      value: String(overview.branchCount),
      icon: Building2,
      accent: 'from-indigo-500/20 to-indigo-500/5',
      iconBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
    },
    {
      key: 'totalInventoryValue',
      labelKey: 'organization.inventoryValue',
      value: formatCurrency(overview.totalInventoryValue),
      icon: Package,
      accent: 'from-rose-500/20 to-rose-500/5',
      iconBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    },
    {
      key: 'menuItemCount',
      labelKey: 'organization.menuItems',
      value: String(overview.menuItemCount),
      icon: ShoppingCart,
      accent: 'from-cyan-500/20 to-cyan-500/5',
      iconBg: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
    },
    {
      key: 'lowStockCount',
      labelKey: 'organization.lowStock',
      value: String(overview.lowStockCount),
      icon: AlertTriangle,
      accent: overview.lowStockCount > 0 ? 'from-red-500/20 to-red-500/5' : 'from-green-500/20 to-green-500/5',
      iconBg: overview.lowStockCount > 0 ? 'bg-red-500/15 text-red-600' : 'bg-green-500/15 text-green-600',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-8">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.key} className="relative overflow-hidden border-border/60 bg-card/70 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md">
            <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br', card.accent)} />
            <CardContent className="relative space-y-2 p-4">
              <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', card.iconBg)}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t(card.labelKey)}</p>
                <p className="text-lg font-semibold leading-tight tracking-tight">{card.value}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
