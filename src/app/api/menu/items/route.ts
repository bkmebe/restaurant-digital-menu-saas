import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole } from '@/lib/utils/tenant'

export async function GET() {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', tenant.restaurantId)
    .order('sort_order')

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Database error occurred' } }, { status: 500 })
  }
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'admin')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('menu_items')
    .insert({ ...body, restaurant_id: tenant.restaurantId })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'CREATE_ERROR', message: 'Failed to create record' } }, { status: 400 })
  }
  return NextResponse.json({ data, message: 'Menu item created' }, { status: 201 })
}

export async function PUT(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'admin')
  if (roleError) return roleError

  const { searchParams } = new URL(request.url)
  let id = searchParams.get('id')

  if (!id) {
    try {
      const body = await request.json()
      id = body.id
    } catch {}
  }

  if (!id) {
    return NextResponse.json({ message: 'No id provided' })
  }

  const supabase = await createServerSupabaseClient()
  const body = await request.json().catch(() => ({}))
  const { ['id']: _, ...updateData } = body

  const { data, error } = await supabase
    .from('menu_items')
    .update(updateData)
    .eq('id', id)
    .eq('restaurant_id', tenant.restaurantId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'UPDATE_ERROR', message: 'Failed to update record' } }, { status: 400 })
  }
  return NextResponse.json({ data, message: 'Menu item updated' })
}

export async function DELETE(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'admin')
  if (roleError) return roleError

  const { searchParams } = new URL(request.url)
  let id = searchParams.get('id')

  if (!id) {
    try {
      const body = await request.json()
      id = body.id
    } catch {}
  }

  if (!id) {
    return NextResponse.json({ message: 'No id provided' })
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('menu_items').delete().eq('id', id).eq('restaurant_id', tenant.restaurantId)

  if (error) {
    return NextResponse.json({ error: { code: 'DELETE_ERROR', message: 'Failed to delete record' } }, { status: 400 })
  }
  return NextResponse.json({ message: 'Menu item deleted' })
}
