'use client'

import { useState } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { PaymentVerificationList } from '@/components/payments/payment-verification-list'
import { PaymentVerificationForm } from '@/components/payments/payment-verification-form'
import { Button } from '@/components/ui/button'
import { RefreshCw, Plus, List } from 'lucide-react'

export default function PaymentVerificationPage() {
  const { t } = useLanguage()
  const [view, setView] = useState<'list' | 'new'>('list')
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('payment.verification.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('payment.verification.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {view === 'new' ? (
            <Button variant="outline" className="gap-2" onClick={() => setView('list')}>
              <List className="h-4 w-4" />
              {t('payment.verification.viewAll')}
            </Button>
          ) : (
            <Button className="gap-2" onClick={() => setView('new')}>
              <Plus className="h-4 w-4" />
              {t('payment.verification.newVerification')}
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => setRefreshKey((k) => k + 1)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {view === 'new' && (
        <PaymentVerificationForm onSuccess={() => { setView('list'); setRefreshKey((k) => k + 1) }} />
      )}

      <div key={refreshKey}>
        <PaymentVerificationList />
      </div>
    </div>
  )
}
