'use client'

import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, Info } from 'lucide-react'

interface DiscrepancyCardProps {
  discrepancyAmount?: number
  notes?: string
  status?: string
}

export function DiscrepancyCard({ discrepancyAmount = 0, notes, status }: DiscrepancyCardProps) {
  const { t } = useLanguage()
  const hasDiscrepancy = Math.abs(discrepancyAmount) > 0
  const isApproved = status === 'approved'

  return (
    <Card className={`border-border/60 bg-card/85 shadow-sm ${hasDiscrepancy && !isApproved ? 'ring-1 ring-red-500/30' : ''}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {hasDiscrepancy ? (
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          ) : (
            <CheckCircle className="h-5 w-5 text-emerald-500" />
          )}
          {t('reconciliation.discrepancy')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('reconciliation.discrepancyAmount')}</span>
          <span className={`text-lg font-bold ${hasDiscrepancy ? 'text-red-600' : 'text-emerald-600'}`}>
            {discrepancyAmount >= 0 ? '+' : ''}{discrepancyAmount.toLocaleString()} ETB
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={isApproved ? 'success' : hasDiscrepancy ? 'warning' : 'default'}>
            {status || 'N/A'}
          </Badge>
        </div>

        {notes && (
          <div className="rounded-lg bg-muted/30 p-3">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{notes}</p>
            </div>
          </div>
        )}

        {hasDiscrepancy && !isApproved && (
          <div className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700">
            {t('reconciliation.discrepancyWarning')}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
