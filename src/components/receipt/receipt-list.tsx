'use client'

import { useEffect, useState } from 'react'
import { useReceipts } from '@/hooks/use-receipts'
import { useLanguage } from '@/hooks/use-language'
import { useAuth } from '@/hooks/use-auth'
import { ReceiptCard } from '@/components/receipt/receipt-card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, RefreshCw } from 'lucide-react'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

interface ReceiptListProps {
  onSelect?: (id: string) => void
  orderId?: string
}

export function ReceiptList({ onSelect, orderId }: ReceiptListProps) {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const { data, total, loading, fetchReceipts } = useReceipts()
  const [searchOrderId, setSearchOrderId] = useState(orderId || '')

  useEffect(() => {
    if (profile?.restaurant_id) {
      fetchReceipts({ orderId: orderId || undefined })
    }
  }, [profile?.restaurant_id, fetchReceipts, orderId])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('receipt.searchByOrder')}
            className="pl-10"
            value={searchOrderId}
            onChange={(e) => setSearchOrderId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') fetchReceipts({ orderId: searchOrderId || undefined })
            }}
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchReceipts({ orderId: searchOrderId || undefined })} className="gap-2">
          <Search className="h-4 w-4" />
          {t('common.search')}
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => { setSearchOrderId(orderId || ''); fetchReceipts({ orderId: orderId || undefined }) }}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <PrinterIcon className="h-12 w-12 mb-4 opacity-20" />
          <p>{t('receipt.noReceipts')}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((receipt) => (
            <ReceiptCard
              key={receipt.id}
              receipt={receipt}
              onClick={onSelect ? () => onSelect(receipt.id) : undefined}
            />
          ))}
        </div>
      )}

      {total > 0 && (
        <p className="text-xs text-muted-foreground">
          {t('common.total')}: {total}
        </p>
      )}
    </div>
  )
}

function PrinterIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.057 48.057 0 0 0-3.413-.387m-8.5 0a48.055 48.055 0 0 0-3.413.387A2.25 2.25 0 0 0 3 9.456v6.294A2.25 2.25 0 0 0 5.25 18h.09m8.5-6.75V4.5a1.125 1.125 0 0 0-1.125-1.125h-3.75A1.125 1.125 0 0 0 7.5 4.5v6.75m8.5 0H6.5" />
    </svg>
  )
}
