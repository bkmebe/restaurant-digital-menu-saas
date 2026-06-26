'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/format'
import { Users, Clock } from 'lucide-react'
import type { PayrollSummary } from '@/hooks/use-owner-analytics'

interface Props {
  payroll: PayrollSummary | null
  t: (key: string, params?: Record<string, string | number>) => string
}

export function PayrollSummaryCard({ payroll, t }: Props) {
  if (!payroll) return null

  return (
    <Card className="border-border/60 bg-card/85 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-emerald-500" />
          {t('owner.payroll.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">{t('owner.payroll.employees')}</p>
            <p className="text-lg font-bold">{payroll.employeeCount}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">{t('owner.payroll.salary')}</p>
            <p className="text-lg font-bold">{formatCurrency(payroll.totalSalary)}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">{t('owner.payroll.bonuses')}</p>
            <p className="text-lg font-bold text-emerald-600">{formatCurrency(payroll.totalBonuses)}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">{t('owner.payroll.deductions')}</p>
            <p className="text-lg font-bold text-red-600">{formatCurrency(payroll.totalDeductions)}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">{t('owner.payroll.netPay')}</p>
            <p className="text-lg font-bold">{formatCurrency(payroll.netPay)}</p>
          </div>
        </div>
        {payroll.pendingCount > 0 && (
          <div className="mt-4 flex items-center gap-2 text-sm text-amber-600">
            <Clock className="h-4 w-4" />
            {t('owner.payroll.pending', { count: payroll.pendingCount })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
