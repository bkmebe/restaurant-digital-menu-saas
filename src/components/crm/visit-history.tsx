'use client'

import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CalendarDays, DollarSign } from 'lucide-react'
import type { VisitHistoryEntry } from '@/types/enterprise'

interface VisitHistoryProps {
  visits: VisitHistoryEntry[]
  loading?: boolean
}

export function VisitHistory({ visits, loading }: VisitHistoryProps) {
  const { t } = useLanguage()

  return (
    <Card className="border-border/60 bg-card/70 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{t('crm.visitHistory')}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : visits.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t('crm.noVisitHistory')}</p>
        ) : (
          <div className="space-y-2">
            {visits.map(visit => (
              <div key={visit.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p>{visit.visit_date}</p>
                    {visit.notes && <p className="text-xs text-muted-foreground">{visit.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 font-medium">
                  <DollarSign className="h-3.5 w-3.5" />
                  {parseFloat(visit.amount_spent.toString()).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
