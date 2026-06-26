'use client'

import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Users } from 'lucide-react'

interface Shift {
  id: string
  title: string
  start_time: string
  end_time: string
  break_minutes: number
  status: string
  employee_id: string | null
  employees?: { full_name: string; role: string }
}

interface ShiftCardProps {
  shift: Shift
  onClick?: () => void
}

const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'info'> = {
  scheduled: 'default',
  active: 'success',
  completed: 'info',
  cancelled: 'destructive',
  missed: 'warning',
}

export function ShiftCard({ shift, onClick }: ShiftCardProps) {
  const { t } = useLanguage()

  return (
    <Card
      className="border-border/60 bg-card/70 shadow-sm cursor-pointer hover:bg-muted/40 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">{shift.title}</p>
          <Badge variant={STATUS_VARIANTS[shift.status] || 'default'}>
            {t(`shift.status.${shift.status}`)}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
          </span>
          {shift.break_minutes > 0 && (
            <span>{shift.break_minutes}min {t('shift.break')}</span>
          )}
        </div>
        {shift.employees && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{shift.employees.full_name}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {shift.employees.role}
            </Badge>
          </div>
        )}
        {!shift.employee_id && (
          <p className="text-xs text-amber-500 font-medium">{t('shift.unassigned')}</p>
        )}
      </CardContent>
    </Card>
  )
}
