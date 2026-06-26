'use client'

import { useAuth } from '@/hooks/use-auth'
import type { Role } from '@/types/common'

export interface TenantInfo {
  restaurantId: string | null
  organizationId: string | null
  role: Role | null
  userId: string | null
  isLoaded: boolean
}

export function useTenant(): TenantInfo {
  const { profile, user, loading } = useAuth()

  if (loading || !profile || !user) {
    return {
      restaurantId: null,
      organizationId: null,
      role: null,
      userId: null,
      isLoaded: false,
    }
  }

  return {
    restaurantId: profile.restaurant_id,
    organizationId: profile.organization_id ?? null,
    role: profile.role,
    userId: user.id,
    isLoaded: true,
  }
}
