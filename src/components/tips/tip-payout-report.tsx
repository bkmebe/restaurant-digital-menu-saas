'use client'

import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { useTipPools } from '@/hooks/use-tips'
import { useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { FileText, DollarSign } from 'lucide-react'

export function TipPayoutReport() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const { data: pools, loading, fetchPools } = useTipPools()

  useEffect(() => {
    if (profile?.restaurant_id) {
      fetchPools({ status: 'distributed' })
    }
  }, [profile?.restaurant_id, fetchPools])

  if (loading) return <LoadingSpinner />

  if (pools.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-8 w-8" />}
        title={t('tips.noPayouts')}
        description={t('tips.noPayoutsDesc')}
      />
    )
  }

  const totalPaidOut = pools.reduce((s, p) => s + p.total_distributed, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">{t('tips.payoutReports')}</h3>
          <p className="text-xs text-muted-foreground">
            {t('tips.totalDistributed')}: ETB {totalPaidOut.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {pools.map(pool => (
          <Card key={pool.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{pool.name}</span>
                    <Badge variant="success">{t('tips.distributed')}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {pool.pool_period_start} — {pool.pool_period_end}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">ETB {pool.total_distributed.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{t('tips.distributed')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
