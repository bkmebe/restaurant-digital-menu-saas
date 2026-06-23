'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useLanguage } from '@/hooks/use-language'
import { PaymentConfig } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PaymentSettingsForm } from '@/components/admin/payment-settings-form'
import { PaymentConfigFormData } from '@/types/payment'
import { DataTable, Column } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

export default function AdminPaymentsPage() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const [configs, setConfigs] = useState<PaymentConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showNumbers, setShowNumbers] = useState<Set<string>>(new Set())

  const fetchConfigs = async () => {
    if (!profile?.restaurant_id) { setLoading(false); return }
    const supabase = createClient()
    const { data } = await supabase.from('payment_configs').select('*').eq('restaurant_id', profile.restaurant_id).order('sort_order')
    if (data) setConfigs(data as PaymentConfig[])
    setLoading(false)
  }

  useEffect(() => { fetchConfigs() }, [profile?.restaurant_id])

  const handleCreate = async (formData: PaymentConfigFormData) => {
    const supabase = createClient()
    await supabase.from('payment_configs').insert({ ...formData, restaurant_id: profile?.restaurant_id })
    setShowForm(false)
    await fetchConfigs()
  }

  const handleUpdate = async (formData: PaymentConfigFormData) => {
    const supabase = createClient()
    await supabase.from('payment_configs').update(formData).eq('id', editId)
    setEditId(null)
    await fetchConfigs()
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const supabase = createClient()
    await supabase.from('payment_configs').delete().eq('id', deleteId)
    setDeleteId(null)
    await fetchConfigs()
  }

  const toggleShow = (id: string) => {
    const next = new Set(showNumbers)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setShowNumbers(next)
  }

  const editConfig = configs.find(c => c.id === editId)

  const columns: Column[] = [
    { key: 'label', header: t('admin.label'), render: (c: Record<string, unknown>) => <span className="font-medium">{c.label as string}</span> },
    { key: 'provider', header: t('admin.provider'), render: (c: Record<string, unknown>) => <StatusBadge status={c.provider as string} mapping={{ telebirr: 'info', cbe_birr: 'success', bank: 'default', qr: 'warning' }} /> },
    { key: 'account_name', header: t('admin.accountName') },
    { key: 'account_number', header: t('admin.accountNumber'), render: (c: Record<string, unknown>) => (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm">
          {showNumbers.has(c.id as string) ? c.account_number as string : `****${(c.account_number as string).slice(-4)}`}
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleShow(c.id as string)}>
          {showNumbers.has(c.id as string) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </Button>
      </div>
    )},
    { key: 'is_active', header: t('admin.active'), render: (c: Record<string, unknown>) => (c.is_active as boolean) ? <StatusBadge status="Active" mapping={{ Active: 'success' }} /> : <StatusBadge status="Inactive" mapping={{ Inactive: 'destructive' }} /> },
    { key: 'actions', header: t('common.actions'), render: (c: Record<string, unknown>) => (
      <div className="flex gap-2">
        <Button variant="ghost" size="icon" onClick={() => { setEditId(c.id as string); setShowForm(true) }}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id as string)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('admin.paymentSettings')}</h1>
        <Button onClick={() => { setShowForm(true); setEditId(null) }}><Plus className="h-4 w-4 mr-2" />{t('admin.addPaymentMethod')}</Button>
      </div>

      {(showForm || editId) && (
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold mb-4">{editId ? t('admin.payment.editTitle') : t('admin.payment.addTitle')}</h2>
            <PaymentSettingsForm
              onSubmit={editId ? handleUpdate : handleCreate}
              defaultValues={editConfig ? {
                provider: editConfig.provider as 'telebirr' | 'cbe_birr' | 'bank' | 'qr',
                label: editConfig.label,
                account_name: editConfig.account_name,
                account_number: editConfig.account_number,
                qr_image_url: editConfig.qr_image_url || undefined,
                payment_link: editConfig.payment_link || undefined,
                bank_name: editConfig.bank_name || undefined,
                is_active: editConfig.is_active,
                sort_order: editConfig.sort_order,
              } : undefined}
            />
          </CardContent>
        </Card>
      )}

      <DataTable columns={columns} data={configs as unknown as Record<string, unknown>[]} loading={loading} />

      <ConfirmDialog
        open={!!deleteId}
        title={t('admin.deletePaymentTitle')}
        message={t('admin.payment.deleteConfirm')}
        variant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
