'use client'

import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { useTips, useUpdateTip } from '@/hooks/use-tips'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { DollarSign, CheckCircle2, Loader2 } from 'lucide-react'
import type { StaffTipWithEmployee } from '@/hooks/use-tips'

export function TipList() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const { data: tips, loading, fetchTips } = useTips()
  const { update } = useUpdateTip()
  const [confirming, setConfirming] = useState<string | null>(null)

  useEffect(() => {
    if (profile?.restaurant_id) fetchTips()
  }, [profile?.restaurant_id, fetchTips])

  const canManage = profile && ['admin', 'manager', 'system_admin'].includes(profile.role)

  const handleConfirm = async (tip: StaffTipWithEmployee) => {
    setConfirming(tip.id)
    await update(tip.id, { status: 'confirmed' })
    setConfirming(null)
    fetchTips()
  }

  if (loading) return <LoadingSpinner />

  if (tips.length === 0) {
    return (
      <EmptyState
        icon={<DollarSign className="h-8 w-8" />}
        title={t('tips.noTips')}
        description={t('tips.noTipsDesc')}
      />
    )
  }

  return (
    <div className="space-y-2">
      {tips.map(tip => (
        <Card key={tip.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{tip.employee?.name || t('common.unknown')}</span>
                  <Badge variant={tip.status === 'paid_out' ? 'success' : tip.status === 'confirmed' ? 'info' : 'warning'}>
                    {t(`tips.status.${tip.status}`)}
                  </Badge>
                  <Badge variant="default">{tip.tip_type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(tip.created_at).toLocaleDateString()}
                  {tip.notes && ` — ${tip.notes}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">ETB {tip.amount.toLocaleString()}</span>
                {canManage && tip.status === 'pending' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConfirm(tip)}
                    disabled={confirming === tip.id}
                    className="gap-1"
                  >
                    {confirming === tip.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3" />
                    )}
                    {t('tips.confirm')}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
