'use client'

import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Banknote, Calculator } from 'lucide-react'

interface CashReconciliationCardProps {
  expectedCash?: number
  actualCash?: number
  onActualCashChange?: (value: number) => void
  readOnly?: boolean
}

export function CashReconciliationCard({ expectedCash = 0, actualCash, onActualCashChange, readOnly }: CashReconciliationCardProps) {
  const { t } = useLanguage()
  const actual = actualCash ?? expectedCash
  const discrepancy = actual - expectedCash

  return (
    <Card className="border-border/60 bg-card/85 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Banknote className="h-5 w-5 text-emerald-500" />
          {t('reconciliation.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('reconciliation.expectedCash')}</span>
            <span className="font-semibold">ETB {expectedCash.toLocaleString()}</span>
          </div>
        </div>

        {readOnly ? (
          <div className="rounded-lg bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('reconciliation.actualCash')}</span>
              <span className="font-semibold">ETB {actual.toLocaleString()}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">{t('reconciliation.actualCash')}</label>
            <div className="relative">
              <Calculator className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="number"
                step="0.01"
                className="pl-10"
                placeholder={`ETB ${expectedCash.toLocaleString()}`}
                defaultValue={expectedCash}
                onChange={(e) => onActualCashChange?.(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        )}

        <div className={`rounded-lg p-4 ${discrepancy === 0 ? 'bg-emerald-500/10' : Math.abs(discrepancy) > 0 ? 'bg-red-500/10' : 'bg-muted/30'}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('reconciliation.discrepancy')}</span>
            <span className={`font-bold ${discrepancy === 0 ? 'text-emerald-600' : Math.abs(discrepancy) > 0 ? 'text-red-600' : ''}`}>
              {discrepancy >= 0 ? '+' : ''}{discrepancy.toLocaleString()} ETB
            </span>
          </div>
          {discrepancy !== 0 && (
            <p className="mt-1 text-xs text-muted-foreground">{t('reconciliation.discrepancyWarning')}</p>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-muted/20 p-3">
          <Calculator className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{t('reconciliation.tip')}</span>
        </div>
      </CardContent>
    </Card>
  )
}
