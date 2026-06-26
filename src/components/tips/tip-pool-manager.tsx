'use client'

import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { useState } from 'react'
import { useCreatePool, useDistributePool, usePayOut } from '@/hooks/use-tips'
import { calculateTipDistribution, getRoleWeight } from '@/lib/utils/tips'
import { Plus, Loader2, CheckCircle2 } from 'lucide-react'
import type { TipPool } from '@/types/enterprise'

interface TipPoolManagerProps {
  employees: Array<{ id: string; name: string; role: string }>
  openPools: TipPool[]
  onRefresh: () => void
}

export function TipPoolManager({ employees, openPools, onRefresh }: TipPoolManagerProps) {
  const { t } = useLanguage()
  const { create, loading: creating, error: createError } = useCreatePool()
  const { distribute, loading: distributing } = useDistributePool()
  const { payOut, loading: paying } = usePayOut()

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [method, setMethod] = useState<string>('equal_split')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !periodStart || !periodEnd) return
    const pool = await create({
      name,
      description: description || undefined,
      pool_period_start: periodStart,
      pool_period_end: periodEnd,
      distribution_method: method,
    })
    if (pool) {
      setName('')
      setDescription('')
      setPeriodStart('')
      setPeriodEnd('')
      setShowForm(false)
      onRefresh()
    }
  }

  const handleDistribute = async (pool: TipPool) => {
    const eligibleEmployees = employees.filter(e => {
      const roleWeight = getRoleWeight(e.role)
      return roleWeight > 0
    })
    const weighted = eligibleEmployees.map(e => ({
      id: e.id,
      weight: getRoleWeight(e.role),
    }))
    const allocations = calculateTipDistribution(pool.total_collected, weighted, method as any)
    const result = await distribute(
      pool.id,
      allocations.map(a => ({
        employee_id: a.employee_id,
        amount: a.amount,
        weight: weighted.find(w => w.id === a.employee_id)?.weight || 1,
      })),
    )
    if (result) onRefresh()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">{t('tips.poolManagement')}</h3>
          <p className="text-xs text-muted-foreground">{openPools.length} {t('tips.openPools')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('tips.newPool')}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('common.name')}</Label>
                <Input value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('common.description')}</Label>
                <textarea
                  rows={2}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('tips.periodStart')}</Label>
                  <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('tips.periodEnd')}</Label>
                  <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('tips.distributionMethod')}</Label>
                <select
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  value={method}
                  onChange={e => setMethod(e.target.value)}
                >
                  <option value="equal_split">{t('tips.equalSplit')}</option>
                  <option value="hours_worked">{t('tips.byHours')}</option>
                  <option value="role_weighted">{t('tips.byRole')}</option>
                  <option value="sales_contribution">{t('tips.bySales')}</option>
                </select>
              </div>
              {createError && <p className="text-xs text-red-500">{createError}</p>}
              <Button type="submit" disabled={creating} className="w-full gap-2">
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('tips.createPool')}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {openPools.length > 0 && (
        <div className="space-y-2">
          {openPools.map(pool => (
            <Card key={pool.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{pool.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ETB {pool.total_collected.toLocaleString()} {t('tips.collected')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {pool.pool_period_start} — {pool.pool_period_end}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await fetch(`/api/tips/pools/${pool.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: 'closed' }),
                        })
                        onRefresh()
                      }}
                    >
                      {t('tips.closePool')}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleDistribute(pool)}
                      disabled={distributing}
                      className="gap-1"
                    >
                      {distributing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                      {t('tips.distribute')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
