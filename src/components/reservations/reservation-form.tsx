'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { useAvailability } from '@/hooks/use-reservations'
import { Table } from '@/types/database'

interface ReservationFormProps {
  onSubmit: (data: {
    customer_name: string
    customer_phone?: string
    customer_email?: string
    guest_count: number
    reservation_date: string
    reservation_time: string
    duration_minutes?: number
    special_requests?: string
    notes?: string
    table_ids?: string[]
  }) => Promise<boolean>
  loading?: boolean
}

export function ReservationForm({ onSubmit, loading }: ReservationFormProps) {
  const { t } = useLanguage()
  const { data: availableTables, check: checkAvailability, loading: availLoading } = useAvailability()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [guestCount, setGuestCount] = useState(2)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState('19:00')
  const [duration, setDuration] = useState(90)
  const [requests, setRequests] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedTables, setSelectedTables] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (date && time && guestCount > 0) {
      checkAvailability({ date, time, guestCount, durationMinutes: duration })
    }
  }, [date, time, guestCount, duration, checkAvailability])

  const toggleTable = useCallback((tableId: string) => {
    setSelectedTables(prev =>
      prev.includes(tableId) ? prev.filter(id => id !== tableId) : [...prev, tableId]
    )
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !date || !time) return
    setSubmitted(true)

    const ok = await onSubmit({
      customer_name: name.trim(),
      customer_phone: phone.trim() || undefined,
      customer_email: email.trim() || undefined,
      guest_count: guestCount,
      reservation_date: date,
      reservation_time: time,
      duration_minutes: duration,
      special_requests: requests.trim() || undefined,
      notes: notes.trim() || undefined,
      table_ids: selectedTables.length > 0 ? selectedTables : undefined,
    })

    if (ok) {
      setName(''); setPhone(''); setEmail(''); setGuestCount(2)
      setRequests(''); setNotes(''); setSelectedTables([])
      setSubmitted(false)
    }
  }

  return (
    <Card className="border-border/60 bg-card/70 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{t('reservation.newReservation')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{t('reservation.customerName')} *</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guests">{t('reservation.guestCount')}</Label>
              <Input id="guests" type="number" min={1} max={50} value={guestCount} onChange={e => setGuestCount(parseInt(e.target.value) || 1)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t('reservation.phone')}</Label>
              <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('reservation.email')}</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">{t('reservation.date')}</Label>
              <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">{t('reservation.time')}</Label>
              <Input id="time" type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">{t('reservation.duration')} (min)</Label>
              <Input id="duration" type="number" min={30} max={480} step={15} value={duration} onChange={e => setDuration(parseInt(e.target.value) || 90)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('reservation.specialRequests')}</Label>
            <textarea
              value={requests}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRequests(e.target.value)}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {availableTables.length > 0 && (
            <div className="space-y-2">
              <Label>{t('reservation.assignTables')}</Label>
              <div className="flex flex-wrap gap-2">
                {availableTables.map((tbl: Table) => (
                  <Button
                    key={tbl.id}
                    type="button"
                    variant={selectedTables.includes(tbl.id) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleTable(tbl.id)}
                    className="text-xs"
                  >
                    {t('reservation.table')} {tbl.table_number} ({tbl.capacity})
                  </Button>
                ))}
              </div>
            </div>
          )}
          {!availableTables.length && !availLoading && (
            <p className="text-sm text-muted-foreground">{t('reservation.noTablesAvailable')}</p>
          )}
          <Button type="submit" disabled={loading || !name.trim()} className="w-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t('reservation.create')}
          </Button>
          {submitted && !loading && (
            <p className="text-sm text-green-600 dark:text-green-400">{t('reservation.created')}</p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
