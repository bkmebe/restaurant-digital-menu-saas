'use client'

import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { usePayOut } from '@/hooks/use-tips'
import { CheckCircle2, DollarSign, Loader2 } from 'lucide-react'
import type { TipDistribution } from '@/types/enterprise'

interface TipDistributionPanelProps {
  distributions: (TipDistribution & { employee?: { id: string; name: string; role: string } })[]
  poolStatus: string
  canManage?: boolean
  onRefresh?: () => void
}

export function TipDistributionPanel({ distributions, poolStatus, canManage, onRefresh }: TipDistributionPanelProps) {
  const { t } = useLanguage()
  const { payOut, loading } = usePayOut()

  if (distributions.length === 0) {
    return (
      <EmptyState
        icon={<DollarSign className="h-8 w-8" />}
        title={t('tips.noDistributions')}
        description={t('tips.noDistributionsDesc')}
      />
    )
  }

  const unpaidIds = distributions.filter(d => !d.is_paid).map(d => d.id)

  const handlePayOut = async () => {
    if (unpaidIds.length === 0) return
    const ok = await payOut(unpaidIds)
    if (ok) onRefresh?.()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{t('tips.distributions')}</CardTitle>
        {poolStatus === 'distributed' && unpaidIds.length > 0 && canManage && (
          <Button variant="outline" size="sm" onClick={handlePayOut} disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <CheckCircle2 className="h-4 w-4" />
            {t('tips.payOut')} ({unpaidIds.length})
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {distributions.map(d => (
            <div key={d.id} className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{d.employee?.name || t('common.unknown')}</span>
                <span className="text-xs text-muted-foreground">(x{d.weight})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">ETB {d.amount.toLocaleString()}</span>
                {d.is_paid ? (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {t('tips.paid')}
                  </Badge>
                ) : (
                  <Badge variant="warning">{t('tips.unpaid')}</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
