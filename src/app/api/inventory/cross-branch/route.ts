import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole } from '@/lib/utils/tenant'

export async function GET(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'admin')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const orgId = tenant.organizationId

  if (!orgId) {
    return NextResponse.json({ data: [], summary: null })
  }

  const { searchParams } = new URL(request.url)
  const filterBranchId = searchParams.get('branchId')
  const category = searchParams.get('category')

  let restaurantQuery = supabase.from('restaurants').select('id, name').eq('organization_id', orgId)
  if (filterBranchId) {
    restaurantQuery = restaurantQuery.eq('id', filterBranchId)
  }
  const { data: restaurants } = await restaurantQuery
  const restaurantIds = restaurants?.map(r => r.id) || []
  const restaurantMap = new Map(restaurants?.map(r => [r.id, r.name]) || [])

  if (restaurantIds.length === 0) {
    return NextResponse.json({ data: [], summary: null })
  }

  let stockQuery = supabase
    .from('stock_items')
    .select(`
      id, restaurant_id, ingredient_id, current_quantity, unit_id, reorder_level, reorder_quantity, unit_cost, location,
      ingredient:ingredients(id, name, name_am, name_om, category)
    `)
    .in('restaurant_id', restaurantIds)

  if (category) {
    stockQuery = stockQuery.eq('ingredient.category', category)
  }

  const { data: stockItems, error } = await stockQuery

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Database error occurred' } }, { status: 500 })
  }

  const items = (stockItems || []).map(item => ({
    ...item,
    branch_name: restaurantMap.get(item.restaurant_id) || 'Unknown',
  }))

  const categories = [...new Set(items.map(i => (i.ingredient as { category?: string } | null)?.category).filter(Boolean))] as string[]

  const totalValue = items.reduce((sum, i) => sum + (Number(i.current_quantity) * Number(i.unit_cost)), 0)
  const lowStockCount = items.filter(i => Number(i.current_quantity) <= Number(i.reorder_level)).length

  const byBranch = restaurantIds.map(id => {
    const branchItems = items.filter(i => i.restaurant_id === id)
    return {
      id,
      name: restaurantMap.get(id) || 'Unknown',
      itemCount: branchItems.length,
      totalValue: branchItems.reduce((sum, i) => sum + (Number(i.current_quantity) * Number(i.unit_cost)), 0),
      lowStockCount: branchItems.filter(i => Number(i.current_quantity) <= Number(i.reorder_level)).length,
    }
  })

  return NextResponse.json({
    data: items,
    summary: {
      totalItems: items.length,
      totalValue,
      lowStockCount,
      branchCount: restaurantIds.length,
      categories,
    },
    byBranch,
  })
}
