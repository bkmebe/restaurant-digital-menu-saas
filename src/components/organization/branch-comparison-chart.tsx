'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import type { BranchPerformance } from '@/hooks/use-owner-analytics'

interface Props {
  branches: (BranchPerformance & { monthRevenue?: number })[]
  t: (key: string, params?: Record<string, string | number>) => string
}

export function BranchComparisonChart({ branches, t }: Props) {
  if (branches.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {t('common.noData')}
        </CardContent>
      </Card>
    )
  }

  const maxRevenue = Math.max(...branches.map(b => b.revenue), 1)
  const sorted = [...branches].sort((a, b) => b.revenue - a.revenue)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('organization.branchComparison')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sorted.map((branch, i) => {
            const pct = (branch.revenue / maxRevenue) * 100
            return (
              <div key={branch.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium truncate max-w-[160px]">{branch.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold">{formatCurrency(branch.revenue)}</span>
                    {branch.monthRevenue && (
                      <span className="text-xs text-muted-foreground ml-2">{formatCurrency(branch.monthRevenue)}</span>
                    )}
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-blue-500' : i === 2 ? 'bg-purple-500' : 'bg-muted-foreground/30'
                    )}
                    style={{ width: `${pct}%` }}
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
