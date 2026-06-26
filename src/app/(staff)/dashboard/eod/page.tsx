'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useLanguage } from '@/hooks/use-language'
import { useCurrentEOD, useApproveEOD } from '@/hooks/use-eod'
import { EODSummaryCard } from '@/components/eod/eod-summary-card'
import { CashReconciliationCard } from '@/components/eod/cash-reconciliation-card'
import { PaymentBreakdown } from '@/components/eod/payment-breakdown'
import { DiscrepancyCard } from '@/components/eod/discrepancy-card'
import { ClosingWizard } from '@/components/eod/closing-wizard'
import { ApprovalPanel } from '@/components/eod/approval-panel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileSpreadsheet, Play, XCircle } from 'lucide-react'
import Link from 'next/link'

export default function EODPage() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const { data, salesSummary, loading, fetchCurrent } = useCurrentEOD()
  const { reopen } = useApproveEOD()
  const [showWizard, setShowWizard] = useState(false)
  const [wizardComplete, setWizardComplete] = useState(false)

  const isManagement = profile && ['admin', 'manager', 'owner', 'system_admin'].includes(profile.role)
  const isAdmin = profile && ['admin'].includes(profile.role)
  const isManager = profile && ['admin', 'manager'].includes(profile.role)

  useEffect(() => {
    if (profile?.restaurant_id) {
      fetchCurrent()
    }
  }, [profile?.restaurant_id, fetchCurrent])

  const handleReopen = useCallback(async () => {
    if (!data) return
    await reopen(data.id, 'Reopened from dashboard')
    fetchCurrent()
  }, [data, reopen, fetchCurrent])

  if (loading) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6" />
          {t('sidebar.eod')}
        </h1>
        <EODSummaryCard loading />
      </div>
    )
  }

  const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
    open: 'info',
    closed: 'warning',
    approved: 'success',
    reopened: 'warning',
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6" />
          {t('sidebar.eod')}
        </h1>
        <div className="flex items-center gap-3">
          {isManagement && (
            <Link href="/dashboard/eod/history">
              <Button variant="outline" size="sm">{t('eod.viewHistory')}</Button>
            </Link>
          )}
          {isManager && data?.status === 'approved' && (
            <Button variant="outline" size="sm" className="gap-2" onClick={handleReopen}>
              <XCircle className="h-4 w-4" />
              {t('approval.reopen')}
            </Button>
          )}
        </div>
      </div>

      <EODSummaryCard
        totalOrders={salesSummary?.total_orders || data?.total_orders || 0}
        totalSales={salesSummary?.total_sales || data?.total_sales || 0}
        cashSales={salesSummary?.cash_sales || data?.cash_sales || 0}
        cardSales={salesSummary?.card_sales || data?.card_sales || 0}
        mobileSales={salesSummary?.mobile_money_sales || data?.mobile_money_sales || 0}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {!data || data.status === 'approved' || data.status === 'reopened' ? (
            <Card className="border-border/60 bg-card/85 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <Play className="h-8 w-8 text-primary" />
                </div>
                <p className="text-lg font-semibold">{t('eod.noActiveClosing')}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t('eod.noActiveClosingDesc')}</p>
                {isManager && (
                  <Button className="mt-4 gap-2" onClick={() => setShowWizard(true)}>
                    <Play className="h-4 w-4" />
                    {t('eod.openClosing')}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : showWizard || wizardComplete ? (
            <ClosingWizard
              onComplete={() => { setWizardComplete(true); fetchCurrent() }}
              salesSummary={salesSummary}
            />
          ) : (
            <>
              <Card className="border-border/60 bg-card/85 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileSpreadsheet className="h-5 w-5 text-blue-500" />
                    {t('eod.currentClosing')}
                  </CardTitle>
                  <Badge variant={statusVariant[data.status] || 'default'}>
                    {t(`eod.status.${data.status}`)}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between rounded-lg bg-muted/30 p-3">
                    <span className="text-sm text-muted-foreground">{t('common.date')}</span>
                    <span className="font-semibold">{new Date(data.business_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-muted/30 p-3">
                    <span className="text-sm text-muted-foreground">{t('eod.totalOrders')}</span>
                    <span className="font-semibold">{data.total_orders}</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-muted/30 p-3">
                    <span className="text-sm text-muted-foreground">{t('eod.totalSales')}</span>
                    <span className="font-semibold">ETB {data.total_sales.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-muted/30 p-3">
                    <span className="text-sm text-muted-foreground">{t('closing.paymentBreakdown')}</span>
                    <div className="text-right text-sm">
                      <p>Cash: ETB {data.cash_sales.toLocaleString()}</p>
                      <p>Card: ETB {data.card_sales.toLocaleString()}</p>
                      <p>Mobile: ETB {data.mobile_money_sales.toLocaleString()}</p>
                    </div>
                  </div>
                  {data.notes && (
                    <div className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
                      {data.notes}
                    </div>
                  )}
                </CardContent>
              </Card>

              {isManager && data.status === 'open' && (
                <Button className="w-full gap-2" size="lg" onClick={() => setShowWizard(true)}>
                  <Play className="h-4 w-4" />
                  {t('eod.startClosing')}
                </Button>
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {data && data.status !== 'open' && (
            <DiscrepancyCard
              discrepancyAmount={data.discrepancy_amount}
              notes={data.notes ?? undefined}
              status={data.status}
            />
          )}

          {data && data.status !== 'approved' && (
            <CashReconciliationCard
              expectedCash={data.expected_cash || salesSummary?.cash_sales || 0}
              actualCash={data.actual_cash}
              readOnly
            />
          )}

          {data && data.status === 'closed' && isAdmin && (
            <ApprovalPanel
              eodClosingId={data.id}
              status={data.status}
              onApproved={() => fetchCurrent()}
            />
          )}

          {data && data.status === 'approved' && (
            <Link href={`/dashboard/eod/${data.id}`}>
              <Button variant="outline" className="w-full gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                {t('eod.viewReport')}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
