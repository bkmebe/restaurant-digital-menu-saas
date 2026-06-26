'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { CalendarDays, Users, Clock, AlertTriangle } from 'lucide-react'

interface CoverageData {
  total: number
  assigned: number
  unassigned: number
}

interface ShiftStatisticsProps {
  shifts: { id: string; status: string; employee_id: string | null; shift_date: string }[]
  coverage: Record<string, CoverageData>
  loading?: boolean
  employeesCount: number
}

export function ShiftStatistics({ shifts, coverage, loading, employeesCount }: ShiftStatisticsProps) {
  const { t } = useLanguage()

  if (loading) return <LoadingSpinner size="md" />

  const todayKey = new Date().toISOString().slice(0, 10)
  const todayCoverage = coverage[todayKey]
  const scheduled = shifts.filter((s) => s.status === 'scheduled').length
  const active = shifts.filter((s) => s.status === 'active').length
  const completed = shifts.filter((s) => s.status === 'completed').length
  const unassigned = shifts.filter((s) => !s.employee_id).length
  const totalShifts = shifts.length
  const scheduledDays = new Set(shifts.map((s) => s.shift_date)).size

  const cards = [
    {
      title: t('schedule.totalShifts'),
      value: String(totalShifts),
      subtitle: `${scheduledDays} ${t('schedule.days')}`,
      icon: CalendarDays,
      color: 'from-blue-500/20 to-blue-500/5',
      iconBg: 'bg-blue-500/15 text-blue-600',
    },
    {
      title: t('schedule.activeStaff'),
      value: String(employeesCount),
      subtitle: `${active} ${t('schedule.activeShifts')}`,
      icon: Users,
      color: 'from-emerald-500/20 to-emerald-500/5',
      iconBg: 'bg-emerald-500/15 text-emerald-600',
    },
    {
      title: t('schedule.scheduled'),
      value: String(scheduled),
      subtitle: `${completed} ${t('schedule.completed')}`,
      icon: Clock,
      color: 'from-violet-500/20 to-violet-500/5',
      iconBg: 'bg-violet-500/15 text-violet-600',
    },
    {
      title: t('schedule.unassigned'),
      value: String(unassigned),
      subtitle: todayCoverage
        ? `${todayCoverage.total} ${t('schedule.today')}`
        : t('schedule.noCoverage'),
      icon: AlertTriangle,
      color: unassigned > 0 ? 'from-amber-500/20 to-amber-500/5' : 'from-emerald-500/20 to-emerald-500/5',
      iconBg: unassigned > 0 ? 'bg-amber-500/15 text-amber-600' : 'bg-emerald-500/15 text-emerald-600',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {cards.map((item) => {
        const Icon = item.icon
        return (
          <Card key={item.title} className="relative overflow-hidden border-border/60 bg-card/70 shadow-sm backdrop-blur-sm">
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.color}`} />
            <CardContent className="relative space-y-2 p-4">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.iconBg}`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-xs text-muted-foreground">{item.title}</p>
              <p className="text-lg font-semibold leading-tight tracking-tight">{item.value}</p>
              <p className="text-[10px] text-muted-foreground">{item.subtitle}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export function CoverageAlertCard({ coverage, date }: { coverage: Record<string, CoverageData>; date?: string }) {
  const { t } = useLanguage()
  const [alerts, setAlerts] = useState<{ date: string; unassigned: number }[]>([])

  useEffect(() => {
    const result: { date: string; unassigned: number }[] = []
    for (const [d, cov] of Object.entries(coverage)) {
      if (cov.unassigned > 0) {
        result.push({ date: d, unassigned: cov.unassigned })
      }
    }
    setAlerts(result.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5))
  }, [coverage])

  if (alerts.length === 0) {
    return (
      <Card className="border-border/60 bg-card/85 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-emerald-600">
            <Users className="h-5 w-5" />
            <p className="text-sm font-medium">{t('coverage.allCovered')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-amber-500/30 bg-amber-500/5 shadow-sm">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-amber-600">
          <AlertTriangle className="h-5 w-5" />
          <p className="text-sm font-medium">{t('coverage.alerts')}</p>
        </div>
        {alerts.map((a) => (
          <div key={a.date} className="flex items-center justify-between text-sm">
            <span>{new Date(a.date).toLocaleDateString()}</span>
            <span className="text-amber-600 font-medium">
              {a.unassigned} {t('coverage.unassigned')}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
