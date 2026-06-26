'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useLanguage } from '@/hooks/use-language'
import { useReceipt } from '@/hooks/use-receipts'
import { ReceiptPreview } from '@/components/receipt/receipt-preview'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function ReceiptDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useLanguage()
  const id = params.id as string
  const { data, loading, error, fetchReceipt } = useReceipt(id)

  useEffect(() => {
    fetchReceipt()
  }, [id, fetchReceipt])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-muted-foreground">{t('receipt.notFound')}</p>
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/receipts')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.push('/dashboard/receipts')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{data.receipt_number}</h1>
          <p className="text-sm text-muted-foreground">
            {t('receipt.orderId')}: {data.order_id.slice(0, 8)}...
          </p>
        </div>
      </div>

      <ReceiptPreview receipt={data} />
    </div>
  )
}
