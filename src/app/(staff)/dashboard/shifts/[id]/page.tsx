'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useLanguage } from '@/hooks/use-language'
import { useShifts, useShiftAssignments } from '@/hooks/use-shifts'
import { ShiftForm } from '@/components/shifts/shift-form'
import { ShiftCard } from '@/components/shifts/shift-card'
import { ShiftAssignmentDialog } from '@/components/shifts/shift-assignment-dialog'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Trash2, UserPlus } from 'lucide-react'

export default function ShiftDetailPage() {
  const { t } = useLanguage()
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const isManagement = profile && ['admin', 'manager', 'system_admin'].includes(profile.role)
  const { data: shifts, fetchShifts, updateShift, deleteShift } = useShifts()
  const { assign, loading: assigning } = useShiftAssignments()
  const [editMode, setEditMode] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [employees, setEmployees] = useState<{ id: string; full_name: string; role: string }[]>([])

  const shift = shifts.find((s) => s.id === params.id)

  useEffect(() => {
    fetchShifts()
    if (profile?.restaurant_id) {
      fetch(`/api/shifts/calendar?from=2000-01-01&to=2100-01-01`)
        .then((r) => r.json())
        .then((body) => setEmployees(body.employees || []))
        .catch(() => {})
    }
  }, [profile?.restaurant_id, fetchShifts])

  if (!shift) {
    return <LoadingSpinner size="lg" />
  }

  const handleUpdate = async (data: { title: string; shift_date: string; start_time: string; end_time: string; break_minutes: number; notes: string; employee_id: string }) => {
    const result = await updateShift(shift.id, data)
    if (result) setEditMode(false)
  }

  const handleDelete = async () => {
    if (confirm(t('shift.deleteConfirm'))) {
      const ok = await deleteShift(shift.id)
      if (ok) router.push('/dashboard/shifts')
    }
  }

  const handleAssign = async (shift_id: string, employee_id: string) => {
    await assign(shift_id, employee_id)
    setShowAssign(false)
    fetchShifts()
  }

  if (editMode) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setEditMode(false)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">{t('shift.edit')}</h1>
        </div>
        <ShiftForm
          initialData={{
            title: shift.title,
            shift_date: shift.shift_date,
            start_time: shift.start_time,
            end_time: shift.end_time,
            break_minutes: shift.break_minutes,
            notes: shift.notes || '',
            employee_id: shift.employee_id || '',
          }}
          employees={employees}
          onSave={handleUpdate}
          onCancel={() => setEditMode(false)}
        />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">{shift.title}</h1>
        </div>
        {isManagement && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
              {t('common.edit')}
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-2">
              <Trash2 className="h-4 w-4" />
              {t('common.delete')}
            </Button>
          </div>
        )}
      </div>

      <ShiftCard shift={shift} />

      <Card className="border-border/60 bg-card/85 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm">{t('shift.details')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('shift.date')}</span>
            <span>{new Date(shift.shift_date).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('shift.startTime')}</span>
            <span>{shift.start_time.slice(0, 5)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('shift.endTime')}</span>
            <span>{shift.end_time.slice(0, 5)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('shift.break')}</span>
            <span>{shift.break_minutes} {t('shift.minutes')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('common.status')}</span>
            <Badge>{t(`shift.status.${shift.status}`)}</Badge>
          </div>
          {shift.notes && (
            <div className="pt-2 border-t border-border/40">
              <p className="text-muted-foreground mb-1">{t('shift.notes')}</p>
              <p>{shift.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {isManagement && (
        <Button onClick={() => setShowAssign(true)} className="w-full gap-2">
          <UserPlus className="h-4 w-4" />
          {t('assignment.assignToShift')}
        </Button>
      )}

      {showAssign && (
        <ShiftAssignmentDialog
          shift={{ id: shift.id, title: shift.title, employee_id: shift.employee_id }}
          employees={employees}
          onAssign={handleAssign}
          onClose={() => setShowAssign(false)}
          loading={assigning}
        />
      )}
    </div>
  )
}
