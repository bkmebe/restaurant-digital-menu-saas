'use client'

import { useState } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { useGenerateReceipt } from '@/hooks/use-receipts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Printer, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { ReceiptType } from '@/types/enterprise'

interface ReceiptGeneratorProps {
  orderId?: string
  onGenerated?: (receiptId: string) => void
}

export function ReceiptGenerator({ orderId: initialOrderId, onGenerated }: ReceiptGeneratorProps) {
  const { t } = useLanguage()
  const { generate, loading, error } = useGenerateReceipt()
  const [orderId, setOrderId] = useState(initialOrderId || '')
  const [receiptType, setReceiptType] = useState<ReceiptType>('thermal_80mm')
  const [success, setSuccess] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!orderId.trim()) return
    setSuccess(null)
    const result = await generate(orderId.trim(), receiptType)
    if (result) {
      setSuccess(result.receipt_number)
      if (onGenerated) onGenerated(result.id)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Printer className="h-4 w-4" />
          {t('receipt.generateTitle')}
        </CardTitle>
        <CardDescription className="text-xs">
          {t('receipt.generateDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            {t('receipt.orderId')}
          </label>
          <Input
            placeholder={t('receipt.orderIdPlaceholder')}
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            disabled={loading || !!initialOrderId}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            {t('receipt.receiptType')}
          </label>
          <Select
            value={receiptType}
            onChange={(e) => setReceiptType(e.target.value as ReceiptType)}
            options={[
              { value: 'thermal_80mm', label: t('receipt.type.thermal') },
              { value: 'pdf', label: t('receipt.type.pdf') },
              { value: 'qr', label: t('receipt.type.qr') },
              { value: 'email', label: t('receipt.type.email') },
            ]}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>{t('receipt.generated').replace('{number}', success)}</span>
          </div>
        )}

        <Button
          onClick={handleGenerate}
          disabled={loading || !orderId.trim()}
          className="w-full gap-2"
        >
          {loading ? (
            <LoadingSpinner />
          ) : (
            <Printer className="h-4 w-4" />
          )}
          {loading ? t('receipt.generating') : t('receipt.generate')}
        </Button>
      </CardContent>
    </Card>
  )
}
