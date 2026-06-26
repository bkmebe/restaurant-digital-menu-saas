import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole, requireMutate } from '@/lib/utils/tenant'
import { type BackupType } from '@/types/enterprise'

export async function GET(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'admin')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('backup_records')
    .select('*', { count: 'exact' })

  if (restaurantId) query = query.eq('restaurant_id', restaurantId)
  if (type) query = query.eq('backup_type', type)
  if (status) query = query.eq('status', status)

  const { data, count, error } = await query
    .order('started_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Failed to fetch backups' } }, { status: 500 })
  }

  return NextResponse.json({
    data: data || [],
    total: count || 0,
    page,
    pageSize,
  })
}

export async function POST(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'admin')
  if (roleError) return roleError

  const mutateError = requireMutate(tenant)
  if (mutateError) return mutateError

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId
  const organizationId = tenant.organizationId

  const body = await request.json()
  const { backup_type, notes } = body as {
    backup_type?: BackupType
    notes?: string
  }

  const validTypes: BackupType[] = ['daily', 'manual', 'on_demand']
  const type = backup_type && validTypes.includes(backup_type) ? backup_type : 'manual'

  const { data, error } = await supabase
    .from('backup_records')
    .insert({
      restaurant_id: restaurantId,
      organization_id: organizationId,
      backup_type: type,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      notes: notes || null,
      created_by: tenant.userId,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Failed to create backup' } }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
