'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useLanguage } from '@/hooks/use-language'
import { Category } from '@/types/database'
import { CategoryForm } from '@/components/admin/category-form'
import { CategoryFormData } from '@/types/menu'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/empty-state'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

export default function CategoriesPage() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchCategories = async () => {
    if (!profile?.restaurant_id) { setLoading(false); return }
    const supabase = createClient()
    const { data } = await supabase.from('categories').select('*').eq('restaurant_id', profile.restaurant_id).order('sort_order')
    if (data) setCategories(data as Category[])
    setLoading(false)
  }

  useEffect(() => { fetchCategories() }, [profile?.restaurant_id])

  const handleCreate = async (formData: CategoryFormData) => {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('categories').insert({ ...formData, restaurant_id: profile?.restaurant_id })
    setShowForm(false)
    setSaving(false)
    await fetchCategories()
  }

  const handleUpdate = async (formData: CategoryFormData) => {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('categories').update(formData).eq('id', editId)
    setEditId(null)
    setSaving(false)
    await fetchCategories()
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const supabase = createClient()
    await supabase.from('categories').delete().eq('id', deleteId)
    setDeleteId(null)
    await fetchCategories()
  }

  const editCategory = categories.find(c => c.id === editId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('admin.categories')}</h1>
        <Button onClick={() => { setShowForm(true); setEditId(null) }}>
          <Plus className="h-4 w-4 mr-2" />{t('admin.addCategory')}
        </Button>
      </div>

      {(showForm || editId) && (
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold mb-4">{editId ? 'Edit Category' : 'New Category'}</h2>
            <CategoryForm
              onSubmit={editId ? handleUpdate : handleCreate}
              defaultValues={editCategory ? {
                name: editCategory.name,
                name_am: editCategory.name_am,
                name_om: editCategory.name_om,
                icon: editCategory.icon,
                sort_order: editCategory.sort_order,
                is_active: editCategory.is_active,
              } : undefined}
              loading={saving}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <Card key={cat.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{cat.icon}</span>
                <div>
                  <p className="font-medium">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">{cat.name_am} / {cat.name_om}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => { setEditId(cat.id); setShowForm(false) }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteId(cat.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Category"
        message="Are you sure? Items in this category may become orphaned."
        variant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
