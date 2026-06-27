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
    .from('restaurants')
    .select('*')
    .eq('id', tenant.restaurantId)
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Database error occurred' } }, { status: 500 })
  }
  return NextResponse.json({ data })
}

export async function PUT(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'admin')
  if (roleError) return roleError

  const mutateError = requireMutate(tenant)
  if (mutateError) return mutateError

  const supabase = await createServerSupabaseClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('restaurants')
    .update(body)
    .eq('id', tenant.restaurantId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'UPDATE_ERROR', message: 'Failed to update record' } }, { status: 400 })
  }
  return NextResponse.json({ data, message: 'Settings updated' })
}
