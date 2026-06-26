'use client'

import { useState } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { useAuth } from '@/hooks/use-auth'
import { useCreateTip } from '@/hooks/use-tips'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Plus, Loader2 } from 'lucide-react'

interface EmployeeOption {
  id: string
  name: string
  role: string
}

interface TipEntryProps {
  employees: EmployeeOption[]
  pools?: Array<{ id: string; name: string }>
  onSuccess?: () => void
}

export function TipEntry({ employees, pools, onSuccess }: TipEntryProps) {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const { create, loading, error, clearError } = useCreateTip()

  const [employeeId, setEmployeeId] = useState('')
  const [tipType, setTipType] = useState<'cash' | 'mobile' | 'manual'>('cash')
  const [amount, setAmount] = useState('')
  const [poolId, setPoolId] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeId || !amount) return
    const tip = await create({
      employee_id: employeeId,
      tip_type: tipType,
      amount: parseFloat(amount),
      tip_pool_id: poolId || undefined,
      notes: notes || undefined,
    })
    if (tip) {
      setAmount('')
      setNotes('')
      onSuccess?.()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {t('tips.addTip')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t('tips.employee')}</Label>
            <select
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={employeeId}
              onChange={e => { setEmployeeId(e.target.value); clearError() }}
              required
            >
              <option value="">{t('tips.selectEmployee')}</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('tips.tipType')}</Label>
              <select
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={tipType}
                onChange={e => setTipType(e.target.value as 'cash' | 'mobile' | 'manual')}
              >
                <option value="cash">{t('tips.cash')}</option>
                <option value="mobile">{t('tips.mobile')}</option>
                <option value="manual">{t('tips.manual')}</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('tips.amount')}</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          {pools && pools.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">{t('tips.tipPool')}</Label>
              <select
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={poolId}
                onChange={e => setPoolId(e.target.value)}
              >
                <option value="">{t('tips.noPool')}</option>
                {pools.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">{t('common.notes')}</Label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              placeholder={t('tips.notesPlaceholder')}
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('tips.saveTip')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
