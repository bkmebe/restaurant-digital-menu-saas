'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCheck, UserMinus, BarChart3 } from 'lucide-react'

interface StaffStats {
  total: number
  active: number
  byRole: Record<string, number>
}

interface Props {
  stats: StaffStats | null
  t: (key: string, params?: Record<string, string | number>) => string
}

export function StaffSummaryCard({ stats, t }: Props) {
  if (!stats) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {t('common.noData')}
        </CardContent>
      </Card>
    )
  }

  const metrics = [
    { label: t('organization.totalStaff'), value: String(stats.total), icon: Users, color: 'text-blue-500' },
    { label: t('organization.activeStaff'), value: String(stats.active), icon: UserCheck, color: 'text-emerald-500' },
    { label: t('organization.inactiveStaff'), value: String(stats.total - stats.active), icon: UserMinus, color: 'text-muted-foreground' },
  ]

  const roleEntries = Object.entries(stats.byRole).sort(([, a], [, b]) => b - a)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('organization.staffSummary')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {metrics.map((m, i) => {
            const Icon = m.icon
            return (
              <div key={i} className="rounded-lg border p-3 text-center">
                <Icon className={`mx-auto mb-1 h-5 w-5 ${m.color}`} />
                <p className="text-lg font-semibold">{m.value}</p>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </div>
            )
          })}
        </div>

        {roleEntries.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">{t('organization.byRole')}</span>
            </div>
            <div className="space-y-1.5">
              {roleEntries.map(([role, count]) => {
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0
                return (
                  <div key={role} className="flex items-center gap-2">
                    <span className="w-24 text-xs text-muted-foreground capitalize">{role.replace(/_/g, ' ')}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-right text-xs font-medium">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
