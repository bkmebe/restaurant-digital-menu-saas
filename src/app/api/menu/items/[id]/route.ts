import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAdminTenant } from '@/lib/utils/tenant'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await requireAdminTenant()
  if (tenant instanceof NextResponse) return tenant

  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const body = await request.json()

  const { data, error } = await supabase.from('menu_items').update(body).eq('id', id).eq('restaurant_id', tenant.restaurantId).select().single()

  if (error) return NextResponse.json({ error: { code: 'UPDATE_ERROR', message: 'Failed to update record' } }, { status: 400 })
  return NextResponse.json({ data, message: 'Item updated' })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await requireAdminTenant()
  if (tenant instanceof NextResponse) return tenant

  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.from('menu_items').delete().eq('id', id).eq('restaurant_id', tenant.restaurantId)

  if (error) return NextResponse.json({ error: { code: 'DELETE_ERROR', message: 'Failed to delete record' } }, { status: 400 })
  return NextResponse.json({ message: 'Item deleted' })
}
