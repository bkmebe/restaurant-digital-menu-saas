'use client'

import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import type { RewardPointsTransaction } from '@/types/enterprise'

interface PointsHistoryProps {
  transactions: RewardPointsTransaction[]
  balance: number
  loading?: boolean
}

export function PointsHistory({ transactions, balance, loading }: PointsHistoryProps) {
  const { t } = useLanguage()

  return (
    <Card className="border-border/60 bg-card/70 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{t('crm.pointsBalance')}: {balance}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : transactions.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t('crm.noPointsHistory')}</p>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={tx.points > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {tx.points > 0 ? '+' : ''}{tx.points}
                    </span>
                    <Badge variant="outline" className="text-xs">{tx.source}</Badge>
                  </div>
                  {tx.description && <p className="text-xs text-muted-foreground">{tx.description}</p>}
                  <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
