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
        setFormError(t('admin.table.exists', { number: data.table_number }))
      } else {
        setFormError(msg || t('admin.table.failedCreate'))
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
    { key: 'table_number', header: t('admin.table.number'), render: (tbl: Record<string, unknown>) => <span className="font-medium">{t('table.number', { number: tbl.table_number as number })}</span> },
    { key: 'capacity', header: t('admin.table.capacity') },
    { key: 'status', header: t('common.status'), render: (tbl: Record<string, unknown>) => <StatusBadge status={tbl.status as string} mapping={{ available: 'success', occupied: 'destructive', cleaning: 'warning' }} /> },
    { key: 'assigned_waiter', header: t('admin.table.waiter'), render: (tbl: Record<string, unknown>) => {
      const waiter = waiters.find(w => w.id === (tbl.assigned_waiter_id as string))
      return waiter?.full_name || '-'
    }},
    { key: 'qr', header: t('admin.table.qr'), render: (tbl: Record<string, unknown>) => (tbl.qr_code_url as string) ? (
      <a href={(tbl.qr_code_data as string) || '#'} target="_blank" rel="noopener noreferrer">
        <Button variant="ghost" size="sm"><QrCode className="h-4 w-4" /></Button>
      </a>
    ) : (
      <Button variant="outline" size="sm" onClick={() => handleGenerateQR(tbl as unknown as TableType)}>{t('admin.table.generate')}</Button>
    )},
    { key: 'actions', header: t('common.actions'), render: (tbl: Record<string, unknown>) => (
      <Button variant="ghost" size="icon" onClick={() => setDeleteId(tbl.id as string)}>
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
            <h2 className="font-semibold mb-4">{t('admin.table.newTitle')}</h2>
            <TableForm waiters={activeWaiters} onSubmit={handleCreate} error={formError} />
          </CardContent>
        </Card>
      )}

      <DataTable columns={columns} data={tables as unknown as Record<string, unknown>[]} loading={loading} />

      <ConfirmDialog
        open={!!deleteId}
        title={t('admin.deleteTableTitle')}
        message={t('admin.table.deleteConfirm')}
        variant="destructive"
        onConfirm={async () => { if (deleteId) { await deleteTable(deleteId); setDeleteId(null) } }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
