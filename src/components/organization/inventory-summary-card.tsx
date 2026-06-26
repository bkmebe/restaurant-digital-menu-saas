'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/format'
import { Package, AlertTriangle, DollarSign } from 'lucide-react'

interface Props {
  totalIngredients: number
  lowStockCount: number
  totalValue: number
  t: (key: string, params?: Record<string, string | number>) => string
}

export function InventorySummaryCard({ totalIngredients, lowStockCount, totalValue, t }: Props) {
  const stats = [
    {
      label: t('organization.totalIngredients'),
      value: String(totalIngredients),
      icon: Package,
      color: 'text-blue-500',
    },
    {
      label: t('organization.lowStockItems'),
      value: String(lowStockCount),
      icon: AlertTriangle,
      color: lowStockCount > 0 ? 'text-red-500' : 'text-green-500',
    },
    {
      label: t('organization.inventoryValue'),
      value: formatCurrency(totalValue),
      icon: DollarSign,
      color: 'text-purple-500',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('organization.inventorySummary')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                <Icon className={`h-5 w-5 ${stat.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-base font-semibold">{stat.value}</p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
