'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/format'
import { Building2 } from 'lucide-react'
import type { BranchPerformance } from '@/hooks/use-owner-analytics'

interface Props {
  branches: BranchPerformance[]
  t: (key: string, params?: Record<string, string | number>) => string
}

export function BranchComparison({ branches, t }: Props) {
  if (branches.length === 0) {
    return (
      <Card className="border-border/60 bg-card/85 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-indigo-500" />
            {t('owner.branches.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            {t('owner.branches.noData')}
          </div>
        </CardContent>
      </Card>
    )
  }

  const maxRevenue = Math.max(...branches.map(b => b.revenue), 1)

  return (
    <Card className="border-border/60 bg-card/85 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5 text-indigo-500" />
          {t('owner.branches.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {branches.map((branch) => {
            const percentage = (branch.revenue / maxRevenue) * 100
            return (
              <div key={branch.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{branch.name}</span>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>{t('owner.branches.orders', { count: branch.orders })}</span>
                    <span className="font-medium text-foreground w-24 text-right">{formatCurrency(branch.revenue)}</span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500/60 to-indigo-400/40 transition-all duration-500"
                    style={{ width: `${Math.max(percentage, 2)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
