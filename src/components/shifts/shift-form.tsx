'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, X } from 'lucide-react'

interface ShiftFormData {
  title: string
  shift_date: string
  start_time: string
  end_time: string
  break_minutes: number
  notes: string
  employee_id: string
}

interface ShiftFormProps {
  initialData?: Partial<ShiftFormData>
  employees: { id: string; full_name: string; role: string }[]
  onSave: (data: ShiftFormData) => Promise<void>
  onCancel?: () => void
  loading?: boolean
}

export function ShiftForm({ initialData, employees, onSave, onCancel, loading }: ShiftFormProps) {
  const { t } = useLanguage()
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState<ShiftFormData>({
    title: '',
    shift_date: today,
    start_time: '09:00',
    end_time: '17:00',
    break_minutes: 30,
    notes: '',
    employee_id: '',
    ...initialData,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave(form)
  }

  return (
    <Card className="border-border/60 bg-card/85 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {initialData?.title ? t('shift.edit') : t('shift.create')}
          </CardTitle>
          {onCancel && (
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t('shift.title')}</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder={t('shift.titlePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shift_date">{t('shift.date')}</Label>
            <Input
              id="shift_date"
              type="date"
              value={form.shift_date}
              onChange={(e) => setForm({ ...form, shift_date: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">{t('shift.startTime')}</Label>
              <Input
                id="start_time"
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">{t('shift.endTime')}</Label>
              <Input
                id="end_time"
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="break_minutes">{t('shift.breakMinutes')}</Label>
              <Input
                id="break_minutes"
                type="number"
                min={0}
                value={form.break_minutes}
                onChange={(e) => setForm({ ...form, break_minutes: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee_id">{t('shift.assignTo')}</Label>
              <select
                id="employee_id"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={form.employee_id}
                onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
              >
                <option value="">{t('shift.selectEmployee')}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} - {emp.role}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t('shift.notes')}</Label>
            <textarea
              id="notes"
              className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder={t('shift.notesPlaceholder')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                {t('common.cancel')}
              </Button>
            )}
            <Button type="submit" disabled={loading} className="gap-2">
              <Save className="h-4 w-4" />
              {loading ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
