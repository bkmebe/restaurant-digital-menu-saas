'use client'

import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { TipPool } from '@/types/enterprise'
import { CalendarDays, Users, DollarSign } from 'lucide-react'

interface TipPoolCardProps {
  pool: TipPool
  onClick?: () => void
  onClose?: () => void
  canManage?: boolean
}

const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
  open: 'info',
  closed: 'warning',
  distributed: 'success',
}

const METHOD_LABELS: Record<string, string> = {
  equal_split: 'Equal Split',
  hours_worked: 'By Hours',
  role_weighted: 'By Role',
  sales_contribution: 'By Sales',
}

export function TipPoolCard({ pool, onClick, onClose, canManage }: TipPoolCardProps) {
  const { t } = useLanguage()

  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{pool.name}</CardTitle>
        <Badge variant={STATUS_VARIANTS[pool.status] || 'default'}>
          {t(`tips.poolStatus.${pool.status}`)}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{pool.pool_period_start} — {pool.pool_period_end}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{METHOD_LABELS[pool.distribution_method] || pool.distribution_method}</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">ETB {pool.total_collected.toLocaleString()}</span>
              <span className="text-muted-foreground">{t('tips.collected')}</span>
            </div>
            {pool.status === 'open' && canManage && onClose && (
              <Button
                variant="outline"
                size="sm"
                onClick={e => { e.stopPropagation(); onClose() }}
              >
                {t('tips.closePool')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
