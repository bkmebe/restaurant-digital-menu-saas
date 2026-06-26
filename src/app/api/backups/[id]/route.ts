import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole, requireMutate } from '@/lib/utils/tenant'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'admin')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const { id } = await params
  const restaurantId = tenant.restaurantId

  const { data, error } = await supabase
    .from('backup_records')
    .select('*')
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Backup not found' } }, { status: 404 })
  }

  return NextResponse.json({ data })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'admin')
  if (roleError) return roleError

  const mutateError = requireMutate(tenant)
  if (mutateError) return mutateError

  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId

  const body = await request.json()
  const { status, size_bytes, file_url, checksum, completed_at, expires_at, notes } = body as Record<string, unknown>

  const updateData: Record<string, unknown> = {}
  if (status && ['in_progress', 'completed', 'failed'].includes(status as string)) updateData.status = status
  if (size_bytes !== undefined) updateData.size_bytes = size_bytes
  if (file_url !== undefined) updateData.file_url = file_url
  if (checksum !== undefined) updateData.checksum = checksum
  if (completed_at !== undefined) updateData.completed_at = completed_at
  if (expires_at !== undefined) updateData.expires_at = expires_at
  if (notes !== undefined) updateData.notes = notes

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'No valid fields to update' } }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('backup_records')
    .update(updateData)
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Backup not found' } }, { status: 404 })
  }

  return NextResponse.json({ data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'admin')
  if (roleError) return roleError

  const mutateError = requireMutate(tenant)
  if (mutateError) return mutateError

  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId

  const { error } = await supabase
    .from('backup_records')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', restaurantId)

  if (error) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Backup not found' } }, { status: 404 })
  }

  return NextResponse.json({ data: { id } })
}
