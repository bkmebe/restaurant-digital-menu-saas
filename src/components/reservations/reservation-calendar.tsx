'use client'

import { useMemo } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Reservation } from '@/types/enterprise'

interface ReservationCalendarProps {
  reservations: Reservation[]
  currentDate: string
  onPrevDay: () => void
  onNextDay: () => void
  onSelectReservation?: (id: string) => void
}

const statusDotColors: Record<string, string> = {
  pending: 'bg-yellow-500',
  confirmed: 'bg-blue-500',
  seated: 'bg-green-500',
  completed: 'bg-gray-400',
  cancelled: 'bg-red-400',
  no_show: 'bg-orange-500',
}

export function ReservationCalendar({
  reservations,
  currentDate,
  onPrevDay,
  onNextDay,
  onSelectReservation,
}: ReservationCalendarProps) {
  const { t } = useLanguage()

  const today = new Date().toISOString().split('T')[0]
  const isToday = currentDate === today

  const sorted = useMemo(() => {
    return [...reservations].sort((a, b) => a.reservation_time.localeCompare(b.reservation_time))
  }, [reservations])

  return (
    <Card className="border-border/60 bg-card/70 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('reservation.calendar')}</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" onClick={onPrevDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[120px] text-center text-sm font-medium">
              {new Date(currentDate + 'T12:00:00').toLocaleDateString(undefined, {
                weekday: 'short', month: 'short', day: 'numeric',
              })}
            </span>
            <Button variant="outline" size="icon-sm" onClick={onNextDay} disabled={isToday}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t('reservation.noReservations')}</p>
        ) : (
          <div className="space-y-1">
            {sorted.map(r => (
              <button
                key={r.id}
                onClick={() => onSelectReservation?.(r.id)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
              >
                <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">
                  {r.reservation_time.slice(0, 5)}
                </span>
                <span className={`h-2 w-2 shrink-0 rounded-full ${statusDotColors[r.status] || 'bg-gray-400'}`} />
                <span className="flex-1 truncate font-medium">{r.customer_name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {r.guest_count} {t('reservation.guests')}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {r.reservation_time.slice(0, 5)}
                  {' '}
                  {r.duration_minutes}m
                </span>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
