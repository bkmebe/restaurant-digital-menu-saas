'use client'

import { useState } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { useCloseEOD } from '@/hooks/use-eod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CashReconciliationCard } from './cash-reconciliation-card'
import { PaymentBreakdown } from './payment-breakdown'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { AlertTriangle, CheckCircle, ClipboardList, DollarSign, FileText } from 'lucide-react'

interface ClosingWizardProps {
  onComplete?: () => void
  salesSummary?: {
    total_orders: number
    total_sales: number
    cash_sales: number
    card_sales: number
    mobile_money_sales: number
  } | null
}

interface PaymentItem {
  payment_method: string
  expected_amount: number
  actual_amount: number
}

export function ClosingWizard({ onComplete, salesSummary }: ClosingWizardProps) {
  const { t } = useLanguage()
  const { close, loading, error, clearError } = useCloseEOD()
  const [step, setStep] = useState(0)
  const [actualCash, setActualCash] = useState<number>(salesSummary?.cash_sales || 0)
  const [notes, setNotes] = useState('')
  const [paymentItems, setPaymentItems] = useState<PaymentItem[]>([])
  const [submitted, setSubmitted] = useState(false)

  const steps = [
    { label: t('closing.summary'), icon: FileText },
    { label: t('closing.cashReconciliation'), icon: DollarSign },
    { label: t('closing.paymentBreakdown'), icon: ClipboardList },
    { label: t('closing.review'), icon: CheckCircle },
  ]

  const handleSubmit = async () => {
    const result = await close({
      actual_cash: actualCash,
      notes: notes || undefined,
      items: paymentItems.length > 0 ? paymentItems : undefined,
    })
    if (result) {
      setSubmitted(true)
      onComplete?.()
    }
  }

  if (submitted) {
    return (
      <Card className="border-border/60 bg-card/85 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="mb-4 h-12 w-12 text-emerald-500" />
          <p className="text-lg font-semibold">{t('closing.submitted')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('closing.submittedDesc')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => {
          const Icon = s.icon
          const isActive = i === step
          const isDone = i < step
          return (
            <div key={s.label} className="flex items-center gap-2">
              <button
                onClick={() => setStep(i)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive ? 'bg-primary text-primary-foreground' :
                  isDone ? 'bg-emerald-500/15 text-emerald-600' :
                  'bg-muted/30 text-muted-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < steps.length - 1 && <div className="h-px w-4 bg-border" />}
            </div>
          )
        })}
      </div>

      {/* Step content */}
      {step === 0 && salesSummary && (
        <Card className="border-border/60 bg-card/85 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-blue-500" />
              {t('closing.dailySummary')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between rounded-lg bg-muted/30 p-3">
              <span className="text-sm text-muted-foreground">{t('eod.totalOrders')}</span>
              <span className="font-semibold">{salesSummary.total_orders}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-muted/30 p-3">
              <span className="text-sm text-muted-foreground">{t('eod.totalSales')}</span>
              <span className="font-semibold">ETB {salesSummary.total_sales.toLocaleString()}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-muted/30 p-3">
              <span className="text-sm text-muted-foreground">{t('eod.cashSales')}</span>
              <span className="font-semibold">ETB {salesSummary.cash_sales.toLocaleString()}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-muted/30 p-3">
              <span className="text-sm text-muted-foreground">{t('eod.cardSales')}</span>
              <span className="font-semibold">ETB {salesSummary.card_sales.toLocaleString()}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-muted/30 p-3">
              <span className="text-sm text-muted-foreground">{t('eod.mobileSales')}</span>
              <span className="font-semibold">ETB {salesSummary.mobile_money_sales.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <CashReconciliationCard
          expectedCash={salesSummary?.cash_sales || 0}
          actualCash={actualCash}
          onActualCashChange={setActualCash}
        />
      )}

      {step === 2 && (
        <PaymentBreakdown
          items={paymentItems.length > 0 ? paymentItems : undefined}
          onItemsChange={setPaymentItems}
        />
      )}

      {step === 3 && (
        <Card className="border-border/60 bg-card/85 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              {t('closing.review')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/30 p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">{t('reconciliation.expectedCash')}</span>
                <span className="font-semibold">ETB {(salesSummary?.cash_sales || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">{t('reconciliation.actualCash')}</span>
                <span className="font-semibold">ETB {actualCash.toLocaleString()}</span>
              </div>
              <div className="border-t border-border/50 pt-2 flex justify-between">
                <span className="text-sm font-medium">{t('reconciliation.discrepancy')}</span>
                <span className={`font-bold ${actualCash === (salesSummary?.cash_sales || 0) ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {(actualCash - (salesSummary?.cash_sales || 0)) >= 0 ? '+' : ''}{(actualCash - (salesSummary?.cash_sales || 0)).toLocaleString()} ETB
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">{t('closing.notes')}</label>
              <textarea
                className="w-full rounded-lg border border-input bg-background p-3 text-sm min-h-[80px]"
                placeholder={t('closing.notesPlaceholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-600">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            )}

            <Button data-testid="close-eod-button" className="w-full gap-2" size="lg" onClick={handleSubmit} disabled={loading}>
              {loading ? <LoadingSpinner size="sm" /> : <CheckCircle className="h-4 w-4" />}
              {t('closing.submit')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => { setStep(Math.max(0, step - 1)); clearError() }}
          disabled={step === 0}
        >
          {t('common.back')}
        </Button>
        {step < steps.length - 1 && (
          <Button onClick={() => setStep(step + 1)}>
            {t('common.next')}
          </Button>
        )}
      </div>
    </div>
  )
}
