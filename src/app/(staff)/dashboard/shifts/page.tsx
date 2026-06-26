'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useLanguage } from '@/hooks/use-language'
import { useShifts, useShiftCalendar, useShiftAssignments } from '@/hooks/use-shifts'
import { ShiftStatistics, CoverageAlertCard } from '@/components/shifts/shift-statistics'
import { ShiftCard } from '@/components/shifts/shift-card'
import { ShiftForm } from '@/components/shifts/shift-form'
import { ShiftAssignmentDialog } from '@/components/shifts/shift-assignment-dialog'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Plus, Calendar, Users } from 'lucide-react'

const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'info'> = {
  scheduled: 'default',
  active: 'success',
  completed: 'info',
  cancelled: 'destructive',
  missed: 'warning',
}

export default function ShiftsPage() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const isManagement = profile && ['admin', 'manager', 'owner', 'system_admin'].includes(profile.role)
  const { data: shifts, total, loading, fetchShifts, createShift, deleteShift } = useShifts()
  const { data: calendarData, employees, coverage, fetchCalendar } = useShiftCalendar()
  const { assign, loading: assigning } = useShiftAssignments()
  const [showForm, setShowForm] = useState(false)
  const [assigningShift, setAssigningShift] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    fetchShifts({ status: statusFilter || undefined })
  }, [fetchShifts, statusFilter])

  useEffect(() => {
    if (profile?.restaurant_id) {
      const from = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
      const to = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10)
      fetchCalendar(from, to)
    }
  }, [profile?.restaurant_id, fetchCalendar])

  const handleCreateShift = async (data: { title: string; shift_date: string; start_time: string; end_time: string; break_minutes: number; notes: string; employee_id: string }) => {
    const result = await createShift(data)
    if (result) {
      setShowForm(false)
      fetchShifts()
    }
  }

  const handleAssign = async (shift_id: string, employee_id: string) => {
    await assign(shift_id, employee_id)
    setAssigningShift(null)
    fetchShifts()
  }

  const columns: Column[] = [
    { key: 'title', header: t('shift.title') },
    {
      key: 'shift_date',
      header: t('shift.date'),
      render: (item) => new Date(item.shift_date as string).toLocaleDateString(),
    },
    {
      key: 'start_time',
      header: t('shift.startTime'),
      render: (item) => (item.start_time as string).slice(0, 5),
    },
    {
      key: 'end_time',
      header: t('shift.endTime'),
      render: (item) => (item.end_time as string).slice(0, 5),
    },
    {
      key: 'employees',
      header: t('common.name'),
      render: (item) => {
        const emp = item.employees as { full_name: string } | undefined
        return emp?.full_name || t('shift.unassigned')
      },
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (item) => (
        <Badge variant={STATUS_VARIANTS[item.status as string] || 'default'}>
          {t(`shift.status.${item.status as string}`)}
        </Badge>
      ),
    },
  ]

  if (!isManagement) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          {t('sidebar.shifts')}
        </h1>
        <div className="grid grid-cols-1 gap-4">
          {loading ? <LoadingSpinner size="lg" /> : shifts.map((shift) => (
            <ShiftCard key={shift.id} shift={shift} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          {t('sidebar.shifts')}
        </h1>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('shift.create')}
        </Button>
      </div>

      <ShiftStatistics
        shifts={calendarData}
        coverage={coverage}
        employeesCount={employees.length}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center gap-3">
            <select
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">{t('shift.allStatuses')}</option>
              <option value="scheduled">{t('shift.status.scheduled')}</option>
              <option value="active">{t('shift.status.active')}</option>
              <option value="completed">{t('shift.status.completed')}</option>
              <option value="cancelled">{t('shift.status.cancelled')}</option>
              <option value="missed">{t('shift.status.missed')}</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => fetchShifts()}>
              {t('common.refresh')}
            </Button>
          </div>

          <DataTable
            columns={columns}
            data={shifts as unknown as Record<string, unknown>[]}
            loading={loading}
          />

          {total > 0 && (
            <p className="text-xs text-muted-foreground">
              {total} {t('shift.total')}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <CoverageAlertCard coverage={coverage} />
          {assigningShift && (
            <ShiftAssignmentDialog
              shift={{
                id: assigningShift,
                title: shifts.find((s) => s.id === assigningShift)?.title || '',
                employee_id: shifts.find((s) => s.id === assigningShift)?.employee_id || null,
              }}
              employees={employees}
              onAssign={handleAssign}
              onClose={() => setAssigningShift(null)}
              loading={assigning}
            />
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg mx-4">
            <ShiftForm
              employees={employees}
              onSave={handleCreateShift}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
