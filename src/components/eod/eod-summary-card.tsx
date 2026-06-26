'use client'

import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, ShoppingCart, TrendingUp, CreditCard, Smartphone } from 'lucide-react'

interface EODSummaryCardProps {
  totalOrders?: number
  totalSales?: number
  cashSales?: number
  cardSales?: number
  mobileSales?: number
  loading?: boolean
}

export function EODSummaryCard({ totalOrders = 0, totalSales = 0, cashSales = 0, cardSales = 0, mobileSales = 0, loading }: EODSummaryCardProps) {
  const { t } = useLanguage()

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="animate-pulse border-border/60 bg-card/70 shadow-sm">
            <CardContent className="p-4"><div className="h-20 bg-muted rounded" /></CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: t('eod.totalOrders'),
      value: String(totalOrders),
      icon: ShoppingCart,
      color: 'from-blue-500/20 to-blue-500/5',
      iconBg: 'bg-blue-500/15 text-blue-600',
    },
    {
      title: t('eod.totalSales'),
      value: `ETB ${totalSales.toLocaleString()}`,
      icon: DollarSign,
      color: 'from-emerald-500/20 to-emerald-500/5',
      iconBg: 'bg-emerald-500/15 text-emerald-600',
    },
    {
      title: t('eod.cashSales'),
      value: `ETB ${cashSales.toLocaleString()}`,
      icon: TrendingUp,
      color: 'from-amber-500/20 to-amber-500/5',
      iconBg: 'bg-amber-500/15 text-amber-600',
    },
    {
      title: t('eod.cardSales'),
      value: `ETB ${cardSales.toLocaleString()}`,
      icon: CreditCard,
      color: 'from-purple-500/20 to-purple-500/5',
      iconBg: 'bg-purple-500/15 text-purple-600',
    },
    {
      title: t('eod.mobileSales'),
      value: `ETB ${mobileSales.toLocaleString()}`,
      icon: Smartphone,
      color: 'from-cyan-500/20 to-cyan-500/5',
      iconBg: 'bg-cyan-500/15 text-cyan-600',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
      {cards.map((item) => {
        const Icon = item.icon
        return (
          <Card key={item.title} className="relative overflow-hidden border-border/60 bg-card/70 shadow-sm backdrop-blur-sm">
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.color}`} />
            <CardContent className="relative space-y-2 p-4">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.iconBg}`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-xs text-muted-foreground">{item.title}</p>
              <p className="text-lg font-semibold leading-tight tracking-tight">{item.value}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
