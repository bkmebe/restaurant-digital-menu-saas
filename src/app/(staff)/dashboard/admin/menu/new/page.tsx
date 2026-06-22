'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Category } from '@/types/database'
import { MenuItemForm } from '@/components/admin/menu-item-form'
import { MenuItemFormData } from '@/types/menu'

export default function NewMenuItemPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!profile?.restaurant_id) return
    const supabase = createClient()
    supabase.from('categories').select('*').eq('restaurant_id', profile.restaurant_id).order('name')
      .then(({ data }) => { if (data) setCategories(data as Category[]) })
  }, [profile?.restaurant_id])

  const handleSubmit = async (data: MenuItemFormData) => {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('menu_items').insert({ ...data, restaurant_id: profile?.restaurant_id })
    if (!error) router.push('/dashboard/admin/menu')
    else console.error(error)
    setLoading(false)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Add Menu Item</h1>
      <MenuItemForm categories={categories} onSubmit={handleSubmit} loading={loading} />
    </div>
  )
}
