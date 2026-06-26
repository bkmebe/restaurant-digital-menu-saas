'use client'

import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingUp, Wallet, PiggyBank } from 'lucide-react'

interface TipSummaryCardsProps {
  totalAmount: number
  pendingAmount: number
  paidOutAmount: number
  poolCount: number
  loading?: boolean
}

export function TipSummaryCards({ totalAmount, pendingAmount, paidOutAmount, poolCount, loading }: TipSummaryCardsProps) {
  const { t } = useLanguage()

  const cards = [
    {
      label: t('tips.totalCollected'),
      value: `ETB ${totalAmount.toLocaleString()}`,
      icon: <DollarSign className="h-5 w-5" />,
      color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400',
    },
    {
      label: t('tips.pending'),
      value: `ETB ${pendingAmount.toLocaleString()}`,
      icon: <Wallet className="h-5 w-5" />,
      color: 'text-amber-600 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400',
    },
    {
      label: t('tips.paidOut'),
      value: `ETB ${paidOutAmount.toLocaleString()}`,
      icon: <PiggyBank className="h-5 w-5" />,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400',
    },
    {
      label: t('tips.activePools'),
      value: String(poolCount),
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'text-purple-600 bg-purple-100 dark:bg-purple-950/40 dark:text-purple-400',
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}><CardContent className="p-4"><div className="h-12 animate-pulse rounded bg-muted" /></CardContent></Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(card => (
        <Card key={card.label}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="text-lg font-semibold mt-1">{card.value}</p>
              </div>
              <div className={`rounded-lg p-2 ${card.color}`}>{card.icon}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
