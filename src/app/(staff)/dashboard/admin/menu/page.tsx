'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/hooks/use-language'
import { useAuth } from '@/hooks/use-auth'
import { MenuItem } from '@/types/database'
import { DataTable, Column } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatCurrency } from '@/lib/utils/format'
import Link from 'next/link'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

export default function AdminMenuPage() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchItems = async () => {
    if (!profile?.restaurant_id) { setLoading(false); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('menu_items')
      .select('*, category:categories(*)')
      .eq('restaurant_id', profile.restaurant_id)
      .order('sort_order')
    if (data) setItems(data as unknown as MenuItem[])
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [profile?.restaurant_id])

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('menu_items').delete().eq('id', deleteId)
    setDeleting(false)
    setDeleteId(null)
    await fetchItems()
  }

  const columns: Column[] = [
    { key: 'name', header: t('common.name'), render: (item: Record<string, unknown>) => (
      <div className="flex items-center gap-3">
        {(item.image_url as string) && <img src={item.image_url as string} alt="" className="w-10 h-10 rounded object-cover" />}
        <span className="font-medium">{item.name as string}</span>
      </div>
    )},
    { key: 'category', header: t('common.type'), render: (item: Record<string, unknown>) => ((item.category as { name: string })?.name) || '-' },
    { key: 'price', header: t('menu.price'), render: (item: Record<string, unknown>) => formatCurrency(Number(item.price)) },
    { key: 'is_available', header: t('common.status'), render: (item: Record<string, unknown>) => (
      <StatusBadge status={(item.is_available as boolean) ? 'Available' : 'Unavailable'} mapping={{ Available: 'success', Unavailable: 'destructive' }} />
    )},
    { key: 'actions', header: t('common.actions'), render: (item: Record<string, unknown>) => (
      <div className="flex gap-2">
        <Link href={`/dashboard/admin/menu/${item.id as string}/edit`}>
          <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id as string)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    )},
  ]

  return (
    <div data-testid="menu-items-page" className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('admin.menuManagement')}</h1>
        <Link href="/dashboard/admin/menu/new">
          <Button data-testid="add-menu-item"><Plus className="h-4 w-4 mr-2" />{t('admin.addItem')}</Button>
        </Link>
      </div>

      <DataTable columns={columns} data={items as unknown as Record<string, unknown>[]} loading={loading} />

      <ConfirmDialog
        open={!!deleteId}
        title={t('admin.menu.deleteTitle')}
        message={t('admin.menu.deleteConfirm')}
        variant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  )
}
