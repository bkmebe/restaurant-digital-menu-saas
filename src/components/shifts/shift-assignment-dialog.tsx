'use client'

import { useState } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { UserPlus, X } from 'lucide-react'

interface Employee {
  id: string
  full_name: string
  role: string
}

interface ShiftAssignmentDialogProps {
  shift: { id: string; title: string; employee_id: string | null }
  employees: Employee[]
  onAssign: (shift_id: string, employee_id: string) => Promise<void>
  onClose: () => void
  loading?: boolean
}

export function ShiftAssignmentDialog({ shift, employees, onAssign, onClose, loading }: ShiftAssignmentDialogProps) {
  const { t } = useLanguage()
  const [selectedId, setSelectedId] = useState('')

  const availableEmployees = employees.filter((e) => e.id !== shift.employee_id)

  const handleAssign = async () => {
    if (!selectedId) return
    await onAssign(shift.id, selectedId)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md mx-4 border-border/60 bg-card shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-500" />
              {t('assignment.assignTo')} {shift.title}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <LoadingSpinner size="md" />
          ) : (
            <>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableEmployees.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('assignment.noEmployees')}
                  </p>
                ) : (
                  availableEmployees.map((emp) => (
                    <label
                      key={emp.id}
                      className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        selectedId === emp.id ? 'border-primary bg-primary/5' : 'border-border/60 hover:bg-muted/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="employee"
                        value={emp.id}
                        checked={selectedId === emp.id}
                        onChange={() => setSelectedId(emp.id)}
                        className="h-4 w-4 text-primary"
                      />
                      <div>
                        <p className="text-sm font-medium">{emp.full_name}</p>
                        <p className="text-xs text-muted-foreground">{emp.role}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={onClose}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleAssign} disabled={!selectedId || loading} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  {t('assignment.assign')}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
