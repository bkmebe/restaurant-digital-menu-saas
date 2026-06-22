'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useLanguage } from '@/hooks/use-language'
import { useTables } from '@/hooks/use-tables'
import { useEmployees } from '@/hooks/use-employees'
import { Table as TableType } from '@/types/database'
import { DataTable, Column } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { Card, CardContent } from '@/components/ui/card'
import { TableForm } from '@/components/admin/table-form'
import { TableFormData } from '@/types/table'
import { Plus, QrCode, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

export default function AdminTablesPage() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const { tables, loading, createTable, deleteTable, refetch } = useTables(profile?.restaurant_id)
  const { employees: waiters } = useEmployees(profile?.restaurant_id)
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')

  const activeWaiters = waiters.filter(w => w.role === 'waiter' && w.is_active)

  const handleCreate = async (data: TableFormData) => {
    setFormError('')
    try {
      await createTable({ ...data, restaurant_id: profile?.restaurant_id } as Partial<TableType>)
      setShowForm(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('23505') || msg.includes('unique') || msg.includes('duplicate')) {
        setFormError(`Table number ${data.table_number} already exists. Please use a different number.`)
      } else {
        setFormError(msg || 'Failed to create table')
      }
    }
  }

  const handleGenerateQR = async (table: TableType) => {
    const supabase = createClient()
    const qrData = `${window.location.origin}/menu/${table.id}`
    await supabase.from('tables').update({
      qr_code_data: qrData,
      qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`,
    }).eq('id', table.id)
    await refetch()
  }

  const columns: Column[] = [
    { key: 'table_number', header: 'Table #', render: (t: Record<string, unknown>) => <span className="font-medium">Table {t.table_number as number}</span> },
    { key: 'capacity', header: 'Capacity' },
    { key: 'status', header: 'Status', render: (t: Record<string, unknown>) => <StatusBadge status={t.status as string} mapping={{ available: 'success', occupied: 'destructive', cleaning: 'warning' }} /> },
    { key: 'assigned_waiter', header: 'Waiter', render: (t: Record<string, unknown>) => {
      const waiter = waiters.find(w => w.id === (t.assigned_waiter_id as string))
      return waiter?.full_name || '-'
    }},
    { key: 'qr', header: 'QR', render: (t: Record<string, unknown>) => (t.qr_code_url as string) ? (
      <a href={(t.qr_code_data as string) || '#'} target="_blank" rel="noopener noreferrer">
        <Button variant="ghost" size="sm"><QrCode className="h-4 w-4" /></Button>
      </a>
    ) : (
      <Button variant="outline" size="sm" onClick={() => handleGenerateQR(t as unknown as TableType)}>Generate</Button>
    )},
    { key: 'actions', header: 'Actions', render: (t: Record<string, unknown>) => (
      <Button variant="ghost" size="icon" onClick={() => setDeleteId(t.id as string)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('admin.tableManagement')}</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />{t('admin.addTable')}</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold mb-4">New Table</h2>
            <TableForm waiters={activeWaiters} onSubmit={handleCreate} error={formError} />
          </CardContent>
        </Card>
      )}

      <DataTable columns={columns} data={tables as unknown as Record<string, unknown>[]} loading={loading} />

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Table"
        message="Are you sure you want to delete this table?"
        variant="destructive"
        onConfirm={async () => { if (deleteId) { await deleteTable(deleteId); setDeleteId(null) } }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
