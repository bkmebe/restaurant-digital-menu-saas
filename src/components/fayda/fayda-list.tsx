'use client'

import { useEffect } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { useFaydaVerifications, useFaydaVerify, type FaydaVerificationRecord } from '@/hooks/use-fayda'
import { FaydaStatusBadge } from './fayda-status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Shield, ShieldCheck, Clock, RefreshCw } from 'lucide-react'

export function FaydaList() {
  const { t } = useLanguage()
  const { data, loading, fetch } = useFaydaVerifications()
  const { confirmVerify, loading: confirmLoading } = useFaydaVerify()

  useEffect(() => {
    fetch()
  }, [fetch])

  const handleConfirm = async (id: string) => {
    const ok = await confirmVerify(id)
    if (ok) {
      fetch()
    }
  }

  if (loading && data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={<Shield className="h-12 w-12" />}
        title={t('fayda.noVerifications')}
        description={t('fayda.noVerificationsDesc')}
      />
    )
  }

  return (
    <div className="space-y-3">
      {data.map((v: FaydaVerificationRecord) => (
        <Card key={v.id} className="border-border/60 bg-card/85 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                {v.employee?.full_name || v.fayda_number}
              </CardTitle>
              <FaydaStatusBadge status={v.verification_status} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">{t('fayda.number')}:</span>{' '}
                {v.fayda_number}
              </div>
              <div>
                <span className="text-muted-foreground">{t('fayda.transactionId')}:</span>{' '}
                {v.transaction_id || '—'}
              </div>
              <div>
                <span className="text-muted-foreground">{t('fayda.verifiedAt')}:</span>{' '}
                {v.verified_at ? new Date(v.verified_at).toLocaleDateString() : '—'}
              </div>
              <div>
                <span className="text-muted-foreground">{t('fayda.phone')}:</span>{' '}
                {v.employee?.phone || '—'}
              </div>
            </div>
            {v.verification_status === 'pending' && (
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => handleConfirm(v.id)}
                  disabled={confirmLoading}
                >
                  {confirmLoading ? <LoadingSpinner size="sm" /> : <ShieldCheck className="h-4 w-4" />}
                  {t('fayda.confirmVerify')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
