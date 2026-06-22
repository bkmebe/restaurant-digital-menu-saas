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
    .from('subscriptions')
    .select('*, subscription_plans(*)')
    .eq('organization_id', auth.profile.organization_id)
    .order('current_period_start', { ascending: false })

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const roleError = requireRole(auth, 'admin')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({ ...body, organization_id: auth.profile.organization_id })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'CREATE_ERROR', message: error.message } }, { status: 400 })
  }
  return NextResponse.json({ data, message: 'Subscription created' }, { status: 201 })
}

export async function PUT(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const roleError = requireRole(auth, 'admin')
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
    .from('subscriptions')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'UPDATE_ERROR', message: error.message } }, { status: 400 })
  }
  return NextResponse.json({ data, message: 'Subscription updated' })
}
