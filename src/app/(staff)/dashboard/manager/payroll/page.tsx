'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useLanguage } from '@/hooks/use-language'
import { Payroll, Employee } from '@/types/database'
import { DataTable, Column } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatCurrency } from '@/lib/utils/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'

export default function PayrollPage() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [processing, setProcessing] = useState(false)

  const fetchData = async () => {
    if (!profile?.restaurant_id) return
    const supabase = createClient()

    const [payResult, empResult] = await Promise.all([
      supabase.from('payrolls').select('*, employee:employees(*)').eq('restaurant_id', profile.restaurant_id).eq('month', selectedMonth).eq('year', selectedYear).order('created_at', { ascending: false }),
      supabase.from('employees').select('*').eq('restaurant_id', profile.restaurant_id).eq('is_active', true),
    ])

    if (payResult.data) setPayrolls(payResult.data as unknown as Payroll[])
    if (empResult.data) setEmployees(empResult.data as Employee[])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [profile?.restaurant_id, selectedMonth, selectedYear])

  const processPayroll = async () => {
    setProcessing(true)
    const supabase = createClient()
    const existing = payrolls.map(p => p.employee_id)

    for (const emp of employees) {
      if (existing.includes(emp.id)) continue
      const salary = Number(emp.salary)
      await supabase.from('payrolls').insert({
        restaurant_id: profile?.restaurant_id,
        employee_id: emp.id,
        month: selectedMonth,
        year: selectedYear,
        salary,
        bonuses: 0,
        deductions: 0,
        net_pay: salary,
      })
    }
    setProcessing(false)
    await fetchData()
  }

  const markPaid = async (id: string) => {
    const supabase = createClient()
    await supabase.from('payrolls').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id)
    await fetchData()
  }

  const summary = payrolls.reduce((acc, p) => ({
    totalSalary: acc.totalSalary + Number(p.salary),
    totalBonuses: acc.totalBonuses + Number(p.bonuses),
    totalDeductions: acc.totalDeductions + Number(p.deductions),
    totalNetPay: acc.totalNetPay + Number(p.net_pay),
    paidCount: acc.paidCount + (p.status === 'paid' ? 1 : 0),
  }), { totalSalary: 0, totalBonuses: 0, totalDeductions: 0, totalNetPay: 0, paidCount: 0 })

  const columns: Column[] = [
    { key: 'employee', header: t('payroll.employee'), render: (p: Record<string, unknown>) => (p.employee as Employee)?.full_name || '-' },
    { key: 'salary', header: t('payroll.salary'), render: (p: Record<string, unknown>) => formatCurrency(Number(p.salary)) },
    { key: 'bonuses', header: t('payroll.bonuses'), render: (p: Record<string, unknown>) => formatCurrency(Number(p.bonuses)) },
    { key: 'deductions', header: t('payroll.deductions'), render: (p: Record<string, unknown>) => formatCurrency(Number(p.deductions)) },
    { key: 'net_pay', header: t('payroll.netPay'), render: (p: Record<string, unknown>) => <span className="font-bold">{formatCurrency(Number(p.net_pay))}</span> },
    { key: 'status', header: t('payroll.status'), render: (p: Record<string, unknown>) => <StatusBadge status={p.status as string} mapping={{ pending: 'warning', paid: 'success', cancelled: 'destructive' }} /> },
    { key: 'actions', header: '', render: (p: Record<string, unknown>) => (p.status as string) !== 'paid' ? (
      <Button size="sm" variant="outline" onClick={() => markPaid(p.id as string)}>{t('payroll.markPaid')}</Button>
    ) : null },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('admin.payrollManagement')}</h1>

      <div className="flex items-center gap-4 flex-wrap">
        <Select
          value={String(selectedMonth)}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: new Date(2024, i).toLocaleString('default', { month: 'long' }) }))}
        />
        <Select
          value={String(selectedYear)}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          options={Array.from({ length: 5 }, (_, i) => ({ value: String(2024 + i), label: String(2024 + i) }))}
        />
        <Button onClick={processPayroll} disabled={processing}>
          {processing ? t('payroll.processing') : t('payroll.process')}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card><CardHeader><CardTitle className="text-sm">{t('payroll.totalSalary')}</CardTitle></CardHeader><CardContent><p className="text-xl font-bold">{formatCurrency(summary.totalSalary)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">{t('payroll.totalBonuses')}</CardTitle></CardHeader><CardContent><p className="text-xl font-bold">{formatCurrency(summary.totalBonuses)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">{t('payroll.totalDeductions')}</CardTitle></CardHeader><CardContent><p className="text-xl font-bold">{formatCurrency(summary.totalDeductions)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">{t('payroll.totalNetPay')}</CardTitle></CardHeader><CardContent><p className="text-xl font-bold">{formatCurrency(summary.totalNetPay)}</p></CardContent></Card>
      </div>

      <DataTable columns={columns} data={payrolls as unknown as Record<string, unknown>[]} loading={loading} />
    </div>
  )
}
