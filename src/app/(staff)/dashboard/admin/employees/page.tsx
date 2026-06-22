'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useLanguage } from '@/hooks/use-language'
import { Employee } from '@/types/database'
import { DataTable, Column } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatCurrency, formatPhone } from '@/lib/utils/format'
import Link from 'next/link'
import { Plus, Pencil, UserX } from 'lucide-react'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

export default function AdminEmployeesPage() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [deactivateId, setDeactivateId] = useState<string | null>(null)

  const fetchEmployees = async () => {
    if (!profile?.restaurant_id) { setLoading(false); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('restaurant_id', profile.restaurant_id)
      .eq('is_active', true)
      .order('full_name')
    if (data) setEmployees(data as Employee[])
    setLoading(false)
  }

  useEffect(() => { fetchEmployees() }, [profile?.restaurant_id])

  const handleDeactivate = async () => {
    if (!deactivateId) return
    const supabase = createClient()
    await supabase.from('employees').update({ is_active: false }).eq('id', deactivateId)
    setDeactivateId(null)
    await fetchEmployees()
  }

  const columns: Column[] = [
    { key: 'full_name', header: 'Name', render: (e: Record<string, unknown>) => <span className="font-medium">{e.full_name as string}</span> },
    { key: 'phone', header: 'Phone', render: (e: Record<string, unknown>) => formatPhone(e.phone as string) },
    { key: 'role', header: 'Role', render: (e: Record<string, unknown>) => <StatusBadge status={e.role as string} mapping={{ waiter: 'info', cashier: 'warning', manager: 'default', kitchen_staff: 'success', inventory_manager: 'secondary' }} /> },
    { key: 'salary', header: 'Salary', render: (e: Record<string, unknown>) => formatCurrency(Number(e.salary)) },
    { key: 'digital_employee_id', header: 'Emp ID' },
    { key: 'national_id_verified', header: 'NID', render: (e: Record<string, unknown>) => (e.national_id_verified as boolean) ? <StatusBadge status="Verified" mapping={{ Verified: 'success' }} /> : <StatusBadge status="Pending" mapping={{ Pending: 'warning' }} /> },
    { key: 'actions', header: 'Actions', render: (e: Record<string, unknown>) => (
      <div className="flex gap-2">
        <Link href={`/dashboard/admin/employees/${e.id as string}`}>
          <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setDeactivateId(e.id as string)}>
          <UserX className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('admin.employeeManagement')}</h1>
        <Link href="/dashboard/admin/employees/new">
          <Button><Plus className="h-4 w-4 mr-2" />{t('admin.addEmployee')}</Button>
        </Link>
      </div>

      <DataTable columns={columns} data={employees as unknown as Record<string, unknown>[]} loading={loading} />

      <ConfirmDialog
        open={!!deactivateId}
        title="Deactivate Employee"
        message="This employee will no longer be able to access the system."
        variant="destructive"
        confirmLabel="Deactivate"
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateId(null)}
      />
    </div>
  )
}
