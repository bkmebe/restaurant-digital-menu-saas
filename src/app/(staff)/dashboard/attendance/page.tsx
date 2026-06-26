'use client'

import { useAuth } from '@/hooks/use-auth'
import { useLanguage } from '@/hooks/use-language'
import { ClockButton } from '@/components/attendance/clock-button'
import { AttendanceStatsCards } from '@/components/attendance/attendance-stats'
import { AttendanceTable } from '@/components/attendance/attendance-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from 'lucide-react'

export default function AttendancePage() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const isManagement = profile && ['admin', 'manager', 'owner', 'system_admin'].includes(profile.role)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          {t('sidebar.attendance')}
        </h1>
      </div>

      {isManagement && <AttendanceStatsCards />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-border/60 bg-card/85 shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-emerald-500" />
              {t('attendance.clockAction')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <ClockButton />
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/85 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-blue-500" />
              {t('attendance.history')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceTable />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
