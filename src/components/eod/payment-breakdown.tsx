'use client'

import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CreditCard } from 'lucide-react'

interface PaymentItem {
  payment_method: string
  expected_amount: number
  actual_amount: number
}

interface PaymentBreakdownProps {
  items?: PaymentItem[]
  onItemsChange?: (items: PaymentItem[]) => void
  readOnly?: boolean
}

const DEFAULT_PAYMENT_METHODS = ['cash', 'telebirr', 'cbe_birr', 'bank', 'qr']

export function PaymentBreakdown({ items, onItemsChange, readOnly }: PaymentBreakdownProps) {
  const { t } = useLanguage()

  const paymentItems: PaymentItem[] = items && items.length > 0
    ? items
    : DEFAULT_PAYMENT_METHODS.map(m => ({ payment_method: m, expected_amount: 0, actual_amount: 0 }))

  const updateItem = (index: number, actual_amount: number) => {
    if (!onItemsChange) return
    const updated = [...paymentItems]
    updated[index] = { ...updated[index], actual_amount } as PaymentItem
    onItemsChange(updated)
  }

  return (
    <Card className="border-border/60 bg-card/85 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="h-5 w-5 text-purple-500" />
          {t('closing.paymentBreakdown')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-4 px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>{t('closing.paymentMethod')}</span>
            <span>{t('closing.expected')}</span>
            <span>{t('closing.actual')}</span>
            <span>{t('closing.difference')}</span>
          </div>
          {paymentItems.map((item, index) => {
            const diff = item.actual_amount - item.expected_amount
            return (
              <div key={item.payment_method} className="grid grid-cols-4 gap-4 rounded-lg border border-border/50 p-3 items-center">
                <span className="text-sm font-medium capitalize">{item.payment_method.replace(/_/g, ' ')}</span>
                <span className="text-sm">ETB {item.expected_amount.toLocaleString()}</span>
                {readOnly ? (
                  <span className="text-sm">ETB {item.actual_amount.toLocaleString()}</span>
                ) : (
                  <Input
                    type="number"
                    step="0.01"
                    className="h-8 text-sm"
                    defaultValue={item.actual_amount}
                    onChange={(e) => updateItem(index, parseFloat(e.target.value) || 0)}
                  />
                )}
                <span className={`text-sm font-medium ${diff === 0 ? '' : diff > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {diff >= 0 ? '+' : ''}{diff.toLocaleString()}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
