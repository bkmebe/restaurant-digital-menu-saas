import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAuth, requireRole } from '@/lib/utils/auth-guard'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const roleError = requireRole(auth, 'admin')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', auth.profile.restaurant_id)
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }
  return NextResponse.json({ data })
}

export async function PUT(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const roleError = requireRole(auth, 'admin')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('restaurants')
    .update(body)
    .eq('id', auth.profile.restaurant_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'UPDATE_ERROR', message: error.message } }, { status: 400 })
  }
  return NextResponse.json({ data, message: 'Settings updated' })
}
