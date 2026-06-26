'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useLanguage } from '@/hooks/use-language'
import { useReservations, useCreateReservation, useUpdateReservation, useWaitlist } from '@/hooks/use-reservations'
import { ReservationCalendar } from '@/components/reservations/reservation-calendar'
import { ReservationCard } from '@/components/reservations/reservation-card'
import { ReservationForm } from '@/components/reservations/reservation-form'
import { WaitlistPanel } from '@/components/reservations/waitlist-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Plus, Search } from 'lucide-react'

export default function ReservationsPage() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const { data: reservations, total, loading, fetch: fetchReservations } = useReservations()
  const { create, loading: creating } = useCreateReservation()
  const { update } = useUpdateReservation()

  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0] ?? '')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [page, setPage] = useState(1)

  const isManagement = profile && ['admin', 'manager', 'owner', 'system_admin'].includes(profile.role)
  const isStaff = profile && ['admin', 'manager', 'cashier', 'waiter', 'inventory_manager', 'system_admin'].includes(profile.role)

  useEffect(() => {
    fetchReservations({ date: currentDate, status: statusFilter || undefined, search: searchQuery || undefined, page, pageSize: 20 })
  }, [currentDate, statusFilter, searchQuery, page, fetchReservations])

  const handlePrevDay = useCallback(() => {
    const d = new Date(currentDate + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    setCurrentDate(d.toISOString().split('T')[0] ?? '')
  }, [currentDate])

  const handleNextDay = useCallback(() => {
    const d = new Date(currentDate + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    setCurrentDate(d.toISOString().split('T')[0] ?? '')
  }, [currentDate])

  const handleCreate = useCallback(async (data: Parameters<typeof create>[0]): Promise<boolean> => {
    const result = await create(data)
    if (result) { fetchReservations({ date: currentDate }); setShowForm(false); return true }
    return false
  }, [create, fetchReservations, currentDate])

  const handleStatusChange = useCallback(async (id: string, status: string) => {
    const result = await update(id, { status })
    if (result) fetchReservations({ date: currentDate })
  }, [update, fetchReservations, currentDate])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('reservation.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('reservation.description')}</p>
        </div>
        {isStaff && (
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 h-4 w-4" /> {t('reservation.newReservation')}
          </Button>
        )}
      </div>

      {showForm && (
        <ReservationForm onSubmit={handleCreate} loading={creating} />
      )}

      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">{t('reservation.calendar')}</TabsTrigger>
          <TabsTrigger value="list">{t('reservation.list')}</TabsTrigger>
          <TabsTrigger value="waitlist">{t('reservation.waitlist')}</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <ReservationCalendar
            reservations={reservations}
            currentDate={currentDate}
            onPrevDay={handlePrevDay}
            onNextDay={handleNextDay}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reservations.map(r => (
              <ReservationCard key={r.id} reservation={r} onStatusChange={isManagement ? handleStatusChange : undefined} />
            ))}
            {loading && (
              <div className="col-span-full flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="list">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('reservation.search')}
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
                  className="pl-9"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">{t('reservation.allStatuses')}</option>
                <option value="pending">{t('reservation.status.pending')}</option>
                <option value="confirmed">{t('reservation.status.confirmed')}</option>
                <option value="seated">{t('reservation.status.seated')}</option>
                <option value="completed">{t('reservation.status.completed')}</option>
                <option value="cancelled">{t('reservation.status.cancelled')}</option>
                <option value="no_show">{t('reservation.status.no_show')}</option>
              </select>
            </div>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : reservations.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('reservation.noReservations')}</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {reservations.map(r => (
                  <ReservationCard key={r.id} reservation={r} onStatusChange={isManagement ? handleStatusChange : undefined} />
                ))}
              </div>
            )}
            {total > 20 && (
              <div className="flex justify-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  {t('common.previous')}
                </Button>
                <span className="flex items-center text-sm text-muted-foreground">{t('common.page')} {page}</span>
                <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>
                  {t('common.next')}
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="waitlist">
          <WaitlistPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
