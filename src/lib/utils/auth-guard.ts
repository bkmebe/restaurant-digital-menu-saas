import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { hasPermission, enforceReadOnly } from '@/lib/utils/permissions'
import type { Role } from '@/types/common'

interface AuthUser {
  id: string
  email?: string
}

interface AuthProfile {
  id: string
  role: Role
  restaurant_id: string | null
  organization_id: string | null
}

export interface AuthResult {
  user: AuthUser
  profile: AuthProfile
}

async function getAuthUser(): Promise<{ user: AuthUser | null; profile: AuthProfile | null }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, profile: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, restaurant_id, organization_id')
    .eq('id', user.id)
    .single()

  return {
    user: { id: user.id, email: user.email },
    profile: profile
      ? { id: profile.id, role: profile.role as Role, restaurant_id: profile.restaurant_id, organization_id: profile.organization_id }
      : null,
  }
}

export async function requireAuth(): Promise<AuthResult | NextResponse> {
  const { user, profile } = await getAuthUser()
  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    )
  }
  if (!profile) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Profile not found' } },
      { status: 403 }
    )
  }
  return { user, profile }
}

export function requireRole(result: AuthResult, requiredRole: Role): NextResponse | null {
  if (!hasPermission(result.profile.role, requiredRole)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
      { status: 403 }
    )
  }
  return null
}

export function requireMutate(result: AuthResult): NextResponse | null {
  if (enforceReadOnly(result.profile.role)) {
    return NextResponse.json(
      { error: { code: 'READ_ONLY', message: 'Owner accounts have read-only access' } },
      { status: 403 }
    )
  }
  return null
}

export async function requireAdmin(): Promise<AuthResult | NextResponse> {
  const result = await requireAuth()
  if (result instanceof NextResponse) return result
  const roleError = requireRole(result, 'admin')
  if (roleError) return roleError
  return result
}

export async function requireAdminOrOwner(): Promise<AuthResult | NextResponse> {
  const result = await requireAuth()
  if (result instanceof NextResponse) return result
  const roleError = requireRole(result, 'admin')
  if (roleError) return roleError
  return result
}

export async function requireOwner(): Promise<AuthResult | NextResponse> {
  const result = await requireAuth()
  if (result instanceof NextResponse) return result
  const roleError = requireRole(result, 'owner')
  if (roleError) return roleError
  return result
}

export async function requireSystemAdmin(): Promise<AuthResult | NextResponse> {
  const result = await requireAuth()
  if (result instanceof NextResponse) return result
  const roleError = requireRole(result, 'system_admin')
  if (roleError) return roleError
  return result
}
