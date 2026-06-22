import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/utils/auth-guard'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const body = await request.json()

  const { data, error } = await supabase.from('menu_items').update(body).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: { code: 'UPDATE_ERROR', message: error.message } }, { status: 400 })
  return NextResponse.json({ data, message: 'Item updated' })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.from('menu_items').delete().eq('id', id)

  if (error) return NextResponse.json({ error: { code: 'DELETE_ERROR', message: error.message } }, { status: 400 })
  return NextResponse.json({ message: 'Item deleted' })
}
