'use client'

import { useLanguage } from '@/hooks/use-language'
import { PaymentConfig } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/empty-state'
import { Wallet, ExternalLink, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface PaymentMethodsDisplayProps {
  configs: PaymentConfig[]
  loading?: boolean
}

export function PaymentMethodsDisplay({ configs, loading }: PaymentMethodsDisplayProps) {
  const { t } = useLanguage()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  if (configs.length === 0) {
    return <EmptyState icon={<Wallet className="h-8 w-8" />} title={t('payment.title')} description="No payment methods configured" />
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg">{t('payment.title')}</h3>
      {configs.map((config) => (
        <Card key={config.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium">{config.label}</h4>
                <p className="text-sm text-muted-foreground mt-1">{config.account_name}</p>
                <p className="text-sm font-mono mt-0.5">{config.account_number}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(config.account_number, config.id)}
                >
                  {copiedId === config.id ? <span className="text-xs">Copied!</span> : <Copy className="h-4 w-4" />}
                </Button>
                {config.payment_link && (
                  <Button variant="ghost" size="icon" asChild>
                    <a href={config.payment_link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
            {config.qr_image_url && (
              <div className="mt-3 flex justify-center">
                <img src={config.qr_image_url} alt={`${config.label} QR`} className="w-32 h-32 object-contain" />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
