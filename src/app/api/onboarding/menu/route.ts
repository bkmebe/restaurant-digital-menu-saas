import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/utils/auth-guard'

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const { categories } = await request.json()

    if (!Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Categories array is required' } },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const restaurantId = auth.profile.restaurant_id

    const createdCategories: Array<{ id: string; name: string }> = []

    for (const cat of categories) {
      const { data: category, error: catError } = await supabase
        .from('categories')
        .insert({
          restaurant_id: restaurantId,
          name: cat.name,
          name_am: cat.nameAm || cat.name,
          name_om: cat.nameOm || cat.name,
          icon: cat.icon || '',
          sort_order: cat.sortOrder || 0,
          is_active: true,
        })
        .select()
        .single()

      if (catError) continue

      createdCategories.push({ id: category.id, name: category.name })

      if (cat.items && Array.isArray(cat.items)) {
        const menuItems = cat.items.map((item: { name: string; price: number; nameAm?: string; nameOm?: string; description?: string }) => ({
          restaurant_id: restaurantId,
          category_id: category.id,
          name: item.name,
          name_am: item.nameAm || item.name,
          name_om: item.nameOm || item.name,
          description: item.description || '',
          description_am: item.description || '',
          description_om: item.description || '',
          price: item.price,
          is_available: true,
        }))

        await supabase.from('menu_items').insert(menuItems)
      }
    }

    await supabase
      .from('organizations')
      .update({ onboarding_step: 5 })
      .eq('id', auth.profile.organization_id)

    return NextResponse.json({ data: { categories: createdCategories } })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create menu' } },
      { status: 500 }
    )
  }
}
