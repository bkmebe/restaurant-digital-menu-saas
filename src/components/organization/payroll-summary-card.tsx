'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/format'
import { Badge } from '@/components/ui/badge'
import { Users, DollarSign, Clock } from 'lucide-react'
import type { PayrollSummary } from '@/hooks/use-owner-analytics'

interface Props {
  payroll: PayrollSummary | null
  t: (key: string, params?: Record<string, string | number>) => string
}

export function PayrollSummaryCard({ payroll, t }: Props) {
  if (!payroll) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {t('common.noData')}
        </CardContent>
      </Card>
    )
  }

  const stats = [
    { label: t('organization.totalEmployees'), value: String(payroll.employeeCount), icon: Users, color: 'text-blue-500' },
    { label: t('organization.totalSalary'), value: formatCurrency(payroll.totalSalary), icon: DollarSign, color: 'text-emerald-500' },
    { label: t('organization.netPay'), value: formatCurrency(payroll.netPay), icon: DollarSign, color: 'text-purple-500' },
    { label: t('organization.bonuses'), value: formatCurrency(payroll.totalBonuses), icon: DollarSign, color: 'text-amber-500' },
  ]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{t('organization.payrollSummary')}</CardTitle>
        {payroll.pendingCount > 0 && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {payroll.pendingCount} {t('organization.pending')}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-lg font-semibold">{stat.value}</p>
              </div>
            )
          })}
        </div>
        {payroll.totalDeductions > 0 && (
          <div className="mt-4 rounded-lg bg-muted/50 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('organization.totalDeductions')}</span>
              <span className="font-medium text-red-500">{formatCurrency(payroll.totalDeductions)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
