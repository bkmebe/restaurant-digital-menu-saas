'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MenuItem, Category } from '@/types/database'

export function useMenu(restaurantId?: string) {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMenu = async () => {
    if (!restaurantId) { setLoading(false); return }
    setLoading(true)
    const supabase = createClient()

    const { data: cats, error: catError } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('sort_order')

    if (catError) {
      setError(catError.message)
      setLoading(false)
      return
    }

    const { data: menuItems, error: itemError } = await supabase
      .from('menu_items')
      .select('*, category:categories(*)')
      .eq('restaurant_id', restaurantId)
      .eq('is_available', true)
      .order('sort_order')

    if (itemError) {
      setError(itemError.message)
    } else {
      setItems(menuItems as unknown as MenuItem[])
      setCategories(cats as Category[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchMenu()
  }, [restaurantId])

  return { items, categories, loading, error, refetch: fetchMenu }
}
