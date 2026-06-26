'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useLanguage } from '@/hooks/use-language'
import { useShiftCalendar } from '@/hooks/use-shifts'
import { ShiftCalendar, WeeklySchedule } from '@/components/shifts/shift-calendar'
import { CoverageAlertCard } from '@/components/shifts/shift-statistics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarDays, CalendarRange } from 'lucide-react'

export default function ShiftCalendarPage() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const { data, employees, coverage, loading, fetchCalendar } = useShiftCalendar()
  const [view, setView] = useState<'month' | 'week'>('month')
  const [selectedShift, setSelectedShift] = useState<unknown>(null)

  useEffect(() => {
    if (profile?.restaurant_id) {
      const from = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
      const to = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10)
      fetchCalendar(from, to)
    }
  }, [profile?.restaurant_id, fetchCalendar])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6" />
          {t('calendar.title')}
        </h1>
        <div className="flex gap-2">
          <button
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === 'month' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
            onClick={() => setView('month')}
          >
            {t('calendar.month')}
          </button>
          <button
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === 'week' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
            onClick={() => setView('week')}
          >
            {t('calendar.week')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          {view === 'month' ? (
            <ShiftCalendar
              shifts={data}
              loading={loading}
              coverage={coverage}
              onShiftClick={setSelectedShift}
              onDateChange={(from, to) => fetchCalendar(from, to)}
            />
          ) : (
            <Card className="border-border/60 bg-card/85 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarRange className="h-5 w-5 text-emerald-500" />
                  {t('calendar.weeklyView')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <WeeklySchedule shifts={data} employees={employees} />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <CoverageAlertCard coverage={coverage} />
          <Card className="border-border/60 bg-card/85 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm">{t('calendar.legend')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-primary/10" />
                <span className="text-muted-foreground">{t('shift.status.scheduled')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-success/10" />
                <span className="text-muted-foreground">{t('shift.status.active')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-info/10" />
                <span className="text-muted-foreground">{t('shift.status.completed')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-destructive/10" />
                <span className="text-muted-foreground">{t('shift.status.cancelled')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-warning/10" />
                <span className="text-muted-foreground">{t('shift.status.missed')}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
