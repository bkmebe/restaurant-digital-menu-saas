'use client'

import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Printer, Mail, CheckCircle2, Clock } from 'lucide-react'
import type { Receipt } from '@/hooks/use-receipts'

const TYPE_ICONS: Record<string, React.ReactNode> = {
  thermal_80mm: <Printer className="h-4 w-4" />,
  pdf: <Printer className="h-4 w-4" />,
  qr: <CheckCircle2 className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
}

const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning'> = {
  generated: 'default',
  sent: 'success',
  regenerated: 'warning',
}

interface ReceiptCardProps {
  receipt: Receipt
  onClick?: () => void
}

export function ReceiptCard({ receipt, onClick }: ReceiptCardProps) {
  const { t } = useLanguage()

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          {TYPE_ICONS[receipt.receipt_type] || <Printer className="h-4 w-4" />}
          <CardTitle className="text-sm font-medium">
            {receipt.receipt_number}
          </CardTitle>
        </div>
        <Badge variant={STATUS_VARIANTS[receipt.status] || 'default'}>
          {t(`receipt.status.${receipt.status}`)}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{new Date(receipt.created_at).toLocaleString()}</span>
          </div>
          {receipt.sent_to && (
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              <span>{receipt.sent_to}</span>
            </div>
          )}
          <p className="pt-1 font-mono text-[10px] text-muted-foreground/60">
            {t('common.id')}: {receipt.id.slice(0, 8)}...
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
