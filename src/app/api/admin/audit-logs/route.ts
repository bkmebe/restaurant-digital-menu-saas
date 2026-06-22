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
    .from('audit_logs')
    .select('*')
    .eq('restaurant_id', auth.profile.restaurant_id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }
  return NextResponse.json({ data })
}
