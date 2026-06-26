'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { ShiftCard } from './shift-card'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Shift {
  id: string
  title: string
  shift_date: string
  start_time: string
  end_time: string
  break_minutes: number
  status: string
  employee_id: string | null
  employees?: { full_name: string; role: string }
}

interface CoverageData {
  total: number
  assigned: number
  unassigned: number
}

interface ShiftCalendarProps {
  shifts: Shift[]
  loading?: boolean
  coverage?: Record<string, CoverageData>
  onShiftClick?: (shift: Shift) => void
  onDateChange?: (from: string, to: string) => void
}

export function ShiftCalendar({ shifts, loading, coverage, onShiftClick, onDateChange }: ShiftCalendarProps) {
  const { t } = useLanguage()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarDays, setCalendarDays] = useState<Date[]>([])

  useEffect(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: Date[] = []
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d))
    }
    setCalendarDays(days)

    const from = firstDay.toISOString().slice(0, 10)
    const to = lastDay.toISOString().slice(0, 10)
    onDateChange?.(from, to)
  }, [currentDate, onDateChange])

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))

  const getShiftsForDay = (date: Date) => {
    const key = date.toISOString().slice(0, 10)
    return shifts.filter((s) => s.shift_date === key)
  }

  const getCoverageForDay = (date: Date) => {
    const key = date.toISOString().slice(0, 10)
    return coverage?.[key]
  }

  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (loading) return <LoadingSpinner size="lg" />

  if (shifts.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays className="h-8 w-8" />}
        title={t('schedule.noShifts')}
      />
    )
  }

  return (
    <Card className="border-border/60 bg-card/85 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-500" />
            {monthLabel}
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px bg-border/50 rounded-lg overflow-hidden">
          {dayNames.map((name) => (
            <div key={name} className="bg-muted/30 p-2 text-center text-xs font-medium text-muted-foreground">
              {name}
            </div>
          ))}
          {Array.from({ length: calendarDays[0]?.getDay() || 0 }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-card p-2 min-h-[100px]" />
          ))}
          {calendarDays.map((day) => {
            const dayShifts = getShiftsForDay(day)
            const dayCoverage = getCoverageForDay(day)
            const isToday = day.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)

            return (
              <div
                key={day.toISOString()}
                className={`bg-card p-2 min-h-[100px] space-y-1 ${isToday ? 'ring-1 ring-primary/30' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${isToday ? 'text-primary' : ''}`}>
                    {day.getDate()}
                  </span>
                  {dayCoverage && dayCoverage.unassigned > 0 && (
                    <span className="text-[10px] text-amber-500">{dayCoverage.unassigned}</span>
                  )}
                </div>
                <div className="space-y-1">
                  {dayShifts.slice(0, 3).map((shift) => (
                    <div
                      key={shift.id}
                      className="text-[10px] bg-primary/10 text-primary rounded px-1 py-0.5 truncate cursor-pointer hover:bg-primary/20"
                      onClick={() => onShiftClick?.(shift)}
                    >
                      {shift.start_time.slice(0, 5)} {shift.title}
                    </div>
                  ))}
                  {dayShifts.length > 3 && (
                    <p className="text-[10px] text-muted-foreground">+{dayShifts.length - 3} more</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export function WeeklySchedule({ shifts, employees }: { shifts: Shift[]; employees: { id: string; full_name: string; role: string }[] }) {
  const { t } = useLanguage()
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return d
  })

  if (shifts.length === 0) {
    return <EmptyState icon={<CalendarDays className="h-8 w-8" />} title={t('schedule.noShifts')} />
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const key = day.toISOString().slice(0, 10)
          const dayShifts = shifts.filter((s) => s.shift_date === key)
          const isToday = key === today.toISOString().slice(0, 10)

          return (
            <div key={key} className={`rounded-lg border p-2 ${isToday ? 'border-primary/50 bg-primary/5' : 'border-border/60'}`}>
              <p className={`text-xs font-medium mb-2 text-center ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                {day.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })}
              </p>
              <div className="space-y-1">
                {dayShifts.map((shift) => (
                  <div key={shift.id} className="text-[10px] bg-card rounded p-1.5 border border-border/40">
                    <p className="font-medium truncate">{shift.title}</p>
                    <p className="text-muted-foreground">
                      {shift.start_time.slice(0, 5)}-{shift.end_time.slice(0, 5)}
                    </p>
                    {shift.employees && (
                      <p className="text-muted-foreground truncate">{shift.employees.full_name}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function EmployeeSchedule({ shifts, employeeId }: { shifts: Shift[]; employeeId?: string }) {
  const { t } = useLanguage()
  const filtered = employeeId ? shifts.filter((s) => s.employee_id === employeeId) : shifts

  if (filtered.length === 0) {
    return <EmptyState icon={<CalendarDays className="h-8 w-8" />} title={t('schedule.noShifts')} />
  }

  return (
    <div className="space-y-2">
      {filtered.map((shift) => (
        <ShiftCard key={shift.id} shift={shift} />
      ))}
    </div>
  )
}
