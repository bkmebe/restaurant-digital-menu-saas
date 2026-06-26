'use client'

import { useEffect } from 'react'
import { useAttendanceStats } from '@/hooks/use-attendance'
import { useLanguage } from '@/hooks/use-language'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Users, Clock, ClockArrowUp, TimerOff } from 'lucide-react'

export function AttendanceStatsCards() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const { stats, loading, fetchStats } = useAttendanceStats()

  useEffect(() => {
    if (profile?.restaurant_id) {
      fetchStats()
    }
  }, [profile?.restaurant_id, fetchStats])

  if (loading && !stats) return <LoadingSpinner size="md" />

  const today = stats?.today
  const week = stats?.week

  const cards = [
    {
      title: t('attendance.stats.present'),
      value: String(today?.present ?? 0),
      subtitle: `${t('attendance.stats.clockedIn')}: ${today?.clockedIn ?? 0}`,
      icon: Users,
      color: 'from-emerald-500/20 to-emerald-500/5',
      iconBg: 'bg-emerald-500/15 text-emerald-600',
    },
    {
      title: t('attendance.stats.late'),
      value: String(today?.late ?? 0),
      subtitle: `${week?.totalLateMinutes ?? 0} min this week`,
      icon: Clock,
      color: 'from-amber-500/20 to-amber-500/5',
      iconBg: 'bg-amber-500/15 text-amber-600',
    },
    {
      title: t('attendance.stats.absent'),
      value: String(today?.absent ?? 0),
      subtitle: `${today?.totalActive ?? 0} ${t('attendance.stats.activeStaff')}`,
      icon: TimerOff,
      color: 'from-red-500/20 to-red-500/5',
      iconBg: 'bg-red-500/15 text-red-600',
    },
    {
      title: t('attendance.stats.overtime'),
      value: String(today?.overtime ?? 0),
      subtitle: `${week?.totalOvertimeMinutes ?? 0} min this week`,
      icon: ClockArrowUp,
      color: 'from-blue-500/20 to-blue-500/5',
      iconBg: 'bg-blue-500/15 text-blue-600',
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
