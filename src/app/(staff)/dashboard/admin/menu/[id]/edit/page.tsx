'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { MenuItem, Category } from '@/types/database'
import { MenuItemForm } from '@/components/admin/menu-item-form'
import { MenuItemFormData } from '@/types/menu'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

export default function EditMenuItemPage() {
  const router = useRouter()
  const params = useParams()
  const { profile } = useAuth()
  const [item, setItem] = useState<MenuItem | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile?.restaurant_id) return
    const supabase = createClient()
    Promise.all([
      supabase.from('menu_items').select('*').eq('id', params.id).single(),
      supabase.from('categories').select('*').eq('restaurant_id', profile.restaurant_id).order('name'),
    ]).then(([itemResult, catResult]) => {
      if (itemResult.data) setItem(itemResult.data as MenuItem)
      if (catResult.data) setCategories(catResult.data as Category[])
      setLoading(false)
    })
  }, [profile?.restaurant_id, params.id])

  const handleSubmit = async (data: MenuItemFormData) => {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('menu_items').update(data).eq('id', params.id)
    if (!error) router.push('/dashboard/admin/menu')
    else console.error(error)
    setSaving(false)
  }

  if (loading) return <LoadingSpinner size="lg" />

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Edit Menu Item</h1>
      <MenuItemForm
        categories={categories}
        onSubmit={handleSubmit}
        defaultValues={item ? {
          name: item.name,
          name_am: item.name_am,
          name_om: item.name_om,
          description: item.description,
          description_am: item.description_am,
          description_om: item.description_om,
          price: Number(item.price),
          category_id: item.category_id,
          image_url: item.image_url || undefined,
          is_available: item.is_available,
          is_featured: item.is_featured,
          sort_order: item.sort_order,
        } : undefined}
        loading={saving}
      />
    </div>
  )
}
