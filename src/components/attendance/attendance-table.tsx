'use client'

import { useState } from 'react'
import { useAttendanceHistory } from '@/hooks/use-attendance'
import { useLanguage } from '@/hooks/use-language'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, CalendarDays } from 'lucide-react'

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'destructive' | 'info'> = {
  present: 'success',
  late: 'warning',
  absent: 'destructive',
  half_day: 'warning',
  overtime: 'info',
}

export function AttendanceTable() {
  const { t } = useLanguage()
  const { data, loading, fetchHistory } = useAttendanceHistory()
  const [statusFilter, setStatusFilter] = useState<string>('')

  const columns: Column[] = [
    { key: 'date', header: t('common.date'), render: (item) => new Date(item.date as string).toLocaleDateString() },
    {
      key: 'employees',
      header: t('common.name'),
      render: (item) => {
        const emp = item.employees as { full_name: string } | undefined
        return emp?.full_name || '-'
      },
    },
    {
      key: 'clock_in',
      header: t('attendance.clockIn'),
      render: (item) => item.clock_in ? new Date(item.clock_in as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
    },
    {
      key: 'clock_out',
      header: t('attendance.clockOut'),
      render: (item) => item.clock_out ? new Date(item.clock_out as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (item) => (
        <Badge variant={STATUS_VARIANTS[item.status as string] || 'default'}>
          {t(`attendance.status.${item.status as string}`)}
        </Badge>
      ),
    },
    {
      key: 'late_minutes',
      header: t('attendance.late'),
      render: (item) => (item.late_minutes as number) > 0 ? `${item.late_minutes} min` : '-',
    },
    {
      key: 'overtime_minutes',
      header: t('attendance.overtime'),
      render: (item) => (item.overtime_minutes as number) > 0 ? `${item.overtime_minutes} min` : '-',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              fetchHistory({ status: e.target.value || undefined })
            }}
          >
            <option value="">{t('attendance.allStatuses')}</option>
            <option value="present">{t('attendance.status.present')}</option>
            <option value="late">{t('attendance.status.late')}</option>
            <option value="absent">{t('attendance.status.absent')}</option>
            <option value="half_day">{t('attendance.status.half_day')}</option>
            <option value="overtime">{t('attendance.status.overtime')}</option>
          </select>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchHistory()} className="gap-2">
          <CalendarDays className="h-4 w-4" />
          {t('common.refresh')}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data as unknown as Record<string, unknown>[]}
        loading={loading}
      />
    </div>
  )
}
