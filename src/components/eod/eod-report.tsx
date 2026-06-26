'use client'

import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, CalendarDays, DollarSign, Printer, Download } from 'lucide-react'

interface EODReportProps {
  data?: Record<string, unknown> | null
  report?: Record<string, unknown> | null
  loading?: boolean
}

export function EODReport({ data, report, loading }: EODReportProps) {
  const { t } = useLanguage()

  if (loading) {
    return (
      <Card className="border-border/60 bg-card/85 shadow-sm">
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-48 bg-muted rounded" />
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="border-border/60 bg-card/85 shadow-sm">
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">{t('eod.noData')}</p>
        </CardContent>
      </Card>
    )
  }

  const eod = data as {
    id: string
    business_date: string
    status: string
    total_orders: number
    total_sales: number
    cash_sales: number
    card_sales: number
    mobile_money_sales: number
    expected_cash: number
    actual_cash: number
    discrepancy_amount: number
    closed_at: string | null
    notes: string | null
    closed_by: string | null
    eod_closing_items?: { payment_method: string; expected_amount: number; actual_amount: number; difference: number }[]
  }

  const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
    open: 'info',
    closed: 'warning',
    approved: 'success',
    reopened: 'warning',
  }

  const orders = (report?.orders as Record<string, unknown>[]) || []
  const openOrders = orders.filter(o => o.status === 'open' || o.status === 'preparing')

  return (
    <div className="space-y-6 print:space-y-4" id="eod-report">
      {/* Report header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            {t('eod.reportTitle')}
          </h2>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            {eod.business_date}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant[eod.status] || 'default'} className="text-sm px-3 py-1">
            {t(`eod.status.${eod.status}`)}
          </Badge>
        </div>
      </div>

      {/* Print/Export buttons */}
      <div className="flex gap-2 print:hidden">
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm hover:bg-muted/50">
          <Printer className="h-4 w-4" />
          {t('eod.print')}
        </button>
        <button onClick={() => {
          const blob = new Blob([JSON.stringify({ data: eod, report }, null, 2)], { type: 'text/csv' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `eod-${eod.business_date}.csv`
          a.click()
        }} className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm hover:bg-muted/50">
          <Download className="h-4 w-4" />
          {t('eod.export')}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-border/60 bg-card/70 shadow-sm">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground">{t('eod.totalOrders')}</p>
            <p className="text-2xl font-bold">{eod.total_orders}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/70 shadow-sm">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground">{t('eod.totalSales')}</p>
            <p className="text-2xl font-bold">ETB {eod.total_sales.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/70 shadow-sm">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground">{t('reconciliation.expectedCash')}</p>
            <p className="text-2xl font-bold">ETB {eod.expected_cash.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/70 shadow-sm">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground">{t('reconciliation.discrepancy')}</p>
            <p className={`text-2xl font-bold ${eod.discrepancy_amount === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {eod.discrepancy_amount >= 0 ? '+' : ''}{eod.discrepancy_amount.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Open orders warning */}
      {openOrders.length > 0 && (
        <div className="rounded-lg bg-amber-500/10 p-4 text-sm text-amber-700">
          {t('eod.openOrdersWarning', { count: String(openOrders.length) })}
        </div>
      )}

      {/* Payment breakdown */}
      {eod.eod_closing_items && eod.eod_closing_items.length > 0 && (
        <Card className="border-border/60 bg-card/85 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t('closing.paymentBreakdown')}</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="pb-2 font-semibold">{t('closing.paymentMethod')}</th>
                  <th className="pb-2 font-semibold">{t('closing.expected')}</th>
                  <th className="pb-2 font-semibold">{t('closing.actual')}</th>
                  <th className="pb-2 font-semibold">{t('closing.difference')}</th>
                </tr>
              </thead>
              <tbody>
                {eod.eod_closing_items.map((item) => (
                  <tr key={item.payment_method} className="border-b border-border/30">
                    <td className="py-2 capitalize">{item.payment_method.replace(/_/g, ' ')}</td>
                    <td className="py-2">{item.expected_amount.toLocaleString()}</td>
                    <td className="py-2">{item.actual_amount.toLocaleString()}</td>
                    <td className={`py-2 ${item.difference === 0 ? '' : item.difference > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {item.difference >= 0 ? '+' : ''}{item.difference.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {eod.notes && (
        <Card className="border-border/60 bg-card/85 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t('closing.notes')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{eod.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Generated at */}
      <p className="text-xs text-muted-foreground text-center">
        {t('eod.generatedAt')}: {new Date().toLocaleString()}
      </p>
    </div>
  )
}
