'use client'

import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Reservation } from '@/types/enterprise'
import { CalendarDays, Clock, Users, Phone, Mail, StickyNote } from 'lucide-react'
import Link from 'next/link'

interface ReservationCardProps {
  reservation: Reservation
  onStatusChange?: (id: string, status: string) => void
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  seated: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  completed: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  no_show: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
}

const nextStatuses: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['seated', 'cancelled', 'no_show'],
  seated: ['completed', 'cancelled'],
}

export function ReservationCard({ reservation, onStatusChange }: ReservationCardProps) {
  const { t } = useLanguage()
  const actions = nextStatuses[reservation.status]

  return (
    <Card className="border-border/60 bg-card/70 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold">
          <Link href={`/dashboard/reservations/${reservation.id}`} className="hover:underline">
            {reservation.customer_name}
          </Link>
        </CardTitle>
        <Badge className={statusColors[reservation.status] || ''}>
          {t(`reservation.status.${reservation.status}`)}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{reservation.reservation_date}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {reservation.reservation_time.slice(0, 5)}
              {' \u2014 '}
              {reservation.duration_minutes > 60
                ? `${Math.floor(reservation.duration_minutes / 60)}h ${reservation.duration_minutes % 60}m`
                : `${reservation.duration_minutes}m`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5" />
            <span>{reservation.guest_count} {t('reservation.guests')}</span>
          </div>
          {reservation.customer_phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" />
              <span>{reservation.customer_phone}</span>
            </div>
          )}
          {reservation.customer_email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{reservation.customer_email}</span>
            </div>
          )}
          {reservation.special_requests && (
            <div className="flex items-start gap-2">
              <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="italic">{reservation.special_requests}</span>
            </div>
          )}
        </div>
        {onStatusChange && actions && actions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {actions.map((s) => (
              <Button
                key={s}
                variant="outline"
                size="sm"
                onClick={() => onStatusChange(reservation.id, s)}
                className="text-xs h-7"
              >
                {t(`reservation.action.${s}`)}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
