'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useLanguage } from '@/hooks/use-language'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { ReceiptList } from '@/components/receipt/receipt-list'
import { ReceiptGenerator } from '@/components/receipt/receipt-generator'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Printer } from 'lucide-react'

export default function ReceiptsPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const { t } = useLanguage()
  const [showGenerator, setShowGenerator] = useState(false)
  const canGenerate = profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'cashier'

  if (!isFeatureEnabled('receipts')) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">{t('common.noData')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{t('receipt.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('receipt.subtitle')}</p>
          </div>
        </div>
        {canGenerate && (
          <Button onClick={() => setShowGenerator(!showGenerator)} className="gap-2">
            <Printer className="h-4 w-4" />
            {showGenerator ? t('receipt.viewHistory') : t('receipt.generateNew')}
          </Button>
        )}
      </div>

      {showGenerator && canGenerate && (
        <div className="max-w-md">
          <ReceiptGenerator onGenerated={(id) => {
            setShowGenerator(false)
            router.push(`/dashboard/receipts/${id}`)
          }} />
        </div>
      )}

      <ReceiptList onSelect={(id) => router.push(`/dashboard/receipts/${id}`)} />
    </div>
  )
}
