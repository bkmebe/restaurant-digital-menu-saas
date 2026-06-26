'use client'

import { useEffect } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { usePaymentVerifications, useUpdateVerification, type PaymentVerificationRecord } from '@/hooks/use-payment-verification'
import { PaymentVerificationStatusBadge } from './payment-verification-status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Shield, ShieldCheck, ShieldX, RefreshCw, ExternalLink } from 'lucide-react'
import { useState } from 'react'

export function PaymentVerificationList() {
  const { t } = useLanguage()
  const { data, loading, fetch } = usePaymentVerifications()
  const { update, loading: updateLoading } = useUpdateVerification()
  const [notes, setNotes] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch()
  }, [fetch])

  const handleAction = async (id: string, status: 'verified' | 'rejected') => {
    const ok = await update(id, status, notes[id] || undefined)
    if (ok) {
      fetch()
      setNotes((prev) => { const n = { ...prev }; delete n[id]; return n })
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
        title={t('payment.verification.noVerifications')}
        description={t('payment.verification.noVerificationsDesc')}
      />
    )
  }

  return (
    <div className="space-y-3">
      {data.map((v: PaymentVerificationRecord) => (
        <Card key={v.id} className="border-border/60 bg-card/85 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium capitalize">{v.provider}</CardTitle>
                <PaymentVerificationStatusBadge status={v.status} />
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(v.created_at).toLocaleString()}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-3">
              <div>
                <span className="text-muted-foreground">{t('payment.verification.amount')}:</span>{' '}
                {v.amount ? `${v.amount.toFixed(2)} ${v.currency}` : '—'}
              </div>
              <div>
                <span className="text-muted-foreground">{t('payment.verification.reference')}:</span>{' '}
                {v.verification_reference || '—'}
              </div>
              <div>
                <span className="text-muted-foreground">{t('payment.verification.method')}:</span>{' '}
                {v.verification_method.replace('_', ' ')}
              </div>
              <div>
                <span className="text-muted-foreground">{t('payment.verification.orderRef')}:</span>{' '}
                {v.order ? `#${v.order.id.slice(0, 8)}` : '—'}
              </div>
            </div>

            {v.receipt_image_url && (
              <a
                href={v.receipt_image_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-3"
              >
                <ExternalLink className="h-3 w-3" />
                {t('payment.verification.viewReceipt')}
              </a>
            )}

            {v.status === 'pending' && (
              <div className="space-y-2 mt-3 border-t pt-3">
                <Input
                  placeholder={t('payment.verification.notesPlaceholder')}
                  value={notes[v.id] || ''}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [v.id]: e.target.value }))}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="gap-2"
                    onClick={() => handleAction(v.id, 'verified')}
                    disabled={updateLoading}
                  >
                    {updateLoading ? <LoadingSpinner size="sm" /> : <ShieldCheck className="h-4 w-4" />}
                    {t('payment.verification.verify')}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-2"
                    onClick={() => handleAction(v.id, 'rejected')}
                    disabled={updateLoading}
                  >
                    <ShieldX className="h-4 w-4" />
                    {t('payment.verification.reject')}
                  </Button>
                </div>
              </div>
            )}

            {v.verified_by_employee && (
              <p className="text-xs text-muted-foreground mt-2">
                {t('payment.verification.verifiedBy')}: {v.verified_by_employee.full_name}
                {v.verified_at && ` — ${new Date(v.verified_at).toLocaleString()}`}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
