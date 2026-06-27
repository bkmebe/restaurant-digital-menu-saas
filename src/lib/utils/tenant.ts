import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROLE_HIERARCHY } from '@/lib/utils/permissions'
import type { Role } from '@/types/common'

export interface TenantContext {
  restaurantId: string
  organizationId: string | null
  role: Role
  userId: string
}

const TENANT_HEADERS = {
  RESTAURANT_ID: 'x-tenant-restaurant-id',
  ROLE: 'x-tenant-role',
  USER_ID: 'x-tenant-user-id',
  ORGANIZATION_ID: 'x-tenant-organization-id',
} as const

export async function requireTenant(): Promise<TenantContext | NextResponse> {
  const headersList = await headers()
  const restaurantId = headersList.get(TENANT_HEADERS.RESTAURANT_ID)
  const role = headersList.get(TENANT_HEADERS.ROLE) as Role | null
  const userId = headersList.get(TENANT_HEADERS.USER_ID)
  const organizationId = headersList.get(TENANT_HEADERS.ORGANIZATION_ID)

  if (restaurantId && role && userId) {
    return {
      restaurantId,
      organizationId: organizationId || null,
      role,
      userId,
    }
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, restaurant_id, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Profile not found' } },
      { status: 403 }
    )
  }

  return {
    restaurantId: profile.restaurant_id || '',
    organizationId: profile.organization_id || null,
    role: profile.role as Role,
    userId: profile.id,
  }
}

export function requireRole(tenant: TenantContext, minimumRole: Role): NextResponse | null {
  // System admin isolation: system_admin can only access system-level (admin+) routes
  if (tenant.role === 'system_admin' && minimumRole !== 'system_admin' && minimumRole !== 'admin') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
      { status: 403 }
    )
  }

  if ((ROLE_HIERARCHY[tenant.role] ?? 0) < (ROLE_HIERARCHY[minimumRole] ?? 0)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
      { status: 403 }
    )
  }

  return null
}

export function requireMutate(tenant: TenantContext): NextResponse | null {
  if (tenant.role === 'owner') {
    return NextResponse.json(
      { error: { code: 'READ_ONLY', message: 'Owner accounts have read-only access' } },
      { status: 403 }
    )
  }

  return null
}

export async function requireAdminTenant(): Promise<TenantContext | NextResponse> {
  const result = await requireTenant()
  if (result instanceof NextResponse) return result
  const roleError = requireRole(result, 'admin')
  if (roleError) return roleError
  return result
}

export async function requireOwnerTenant(): Promise<TenantContext | NextResponse> {
  const result = await requireTenant()
  if (result instanceof NextResponse) return result
  const roleError = requireRole(result, 'owner')
  if (roleError) return roleError
  return result
}

export async function requireInventoryManagerTenant(): Promise<TenantContext | NextResponse> {
  const result = await requireTenant()
  if (result instanceof NextResponse) return result
  const roleError = requireRole(result, 'inventory_manager')
  if (roleError) return roleError
  return result
}

export async function requireSystemAdminTenant(): Promise<TenantContext | NextResponse> {
  const result = await requireTenant()
  if (result instanceof NextResponse) return result
  const roleError = requireRole(result, 'system_admin')
  if (roleError) return roleError
  return result
}
