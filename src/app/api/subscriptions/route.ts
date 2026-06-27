import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole, requireMutate } from '@/lib/utils/tenant'

export async function GET() {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'admin')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, subscription_plans(*)')
    .eq('organization_id', tenant.organizationId)
    .order('current_period_start', { ascending: false })

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

  const mutateError = requireMutate(tenant)
  if (mutateError) return mutateError

  const supabase = await createServerSupabaseClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({ ...body, organization_id: tenant.organizationId })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'CREATE_ERROR', message: 'Failed to create record' } }, { status: 400 })
  }
  return NextResponse.json({ data, message: 'Subscription created' }, { status: 201 })
}

export async function PUT(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'admin')
  if (roleError) return roleError

  const mutateError = requireMutate(tenant)
  if (mutateError) return mutateError

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
    .eq('organization_id', tenant.organizationId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'UPDATE_ERROR', message: 'Failed to update record' } }, { status: 400 })
  }
  return NextResponse.json({ data, message: 'Subscription updated' })
}
