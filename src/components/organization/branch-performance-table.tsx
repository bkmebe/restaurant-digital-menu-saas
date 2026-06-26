'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/format'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface BranchRow {
  id: string
  name: string
  totalRevenue: number
  monthRevenue: number
  todayRevenue: number
  totalOrders: number
  monthOrders: number
  avgOrderValue: number
  lowStockCount: number
}

interface Props {
  branches: BranchRow[]
  t: (key: string, params?: Record<string, string | number>) => string
}

export function BranchPerformanceTable({ branches, t }: Props) {
  if (branches.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {t('common.noData')}
        </CardContent>
      </Card>
    )
  }

  const maxRevenue = Math.max(...branches.map(b => b.totalRevenue), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('organization.branchPerformance')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pl-4 font-medium">{t('organization.rank')}</th>
                <th className="pb-2 font-medium">{t('organization.branchName')}</th>
                <th className="pb-2 font-medium text-right">{t('organization.revenue')}</th>
                <th className="pb-2 font-medium text-right">{t('organization.orders')}</th>
                <th className="pb-2 font-medium text-right">{t('organization.aov')}</th>
                <th className="pb-2 font-medium text-right">{t('organization.lowStock')}</th>
                <th className="pb-2 font-medium">{t('organization.trend')}</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch, index) => {
                const share = (branch.totalRevenue / maxRevenue) * 100
                const avgRevenue = branches.reduce((s, b) => s + b.totalRevenue, 0) / branches.length
                const aboveAvg = branch.totalRevenue > avgRevenue
                return (
                  <tr key={branch.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-3 pl-4 pr-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-medium">{branch.name}</p>
                      <div className="mt-1 h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary/60" style={{ width: `${share}%` }} />
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <p className="font-medium">{formatCurrency(branch.totalRevenue)}</p>
                      <p className="text-xs text-muted-foreground">{t('organization.mtd')}: {formatCurrency(branch.monthRevenue)}</p>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <p>{branch.totalOrders}</p>
                      <p className="text-xs text-muted-foreground">{t('organization.mtd')}: {branch.monthOrders}</p>
                    </td>
                    <td className="py-3 pr-4 text-right font-mono">
                      {formatCurrency(branch.avgOrderValue)}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {branch.lowStockCount > 0 ? (
                        <Badge variant="destructive" className="text-xs">{branch.lowStockCount}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {aboveAvg ? (
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                      ) : branch.totalRevenue === avgRevenue ? (
                        <Minus className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
