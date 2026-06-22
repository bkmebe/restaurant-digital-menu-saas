import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

// Test the real auth-guard module, not the global mock from supabase.ts
vi.unmock('@/lib/utils/auth-guard')

// Mock the server module BEFORE importing auth-guard
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    }),
    rpc: vi.fn(),
    storage: { from: vi.fn() },
  }),
}))

interface AuthUser {
  id: string
  email?: string
}

interface AuthProfile {
  id: string
  role: string
  restaurant_id: string | null
}

interface AuthResult {
  user: AuthUser
  profile: AuthProfile
}

type AuthGuardModule = {
  requireAuth: () => Promise<AuthResult | NextResponse>
  requireRole: (result: AuthResult, requiredRole: string) => NextResponse | null
  requireAdmin: () => Promise<AuthResult | NextResponse>
}

describe('Auth Guard', () => {
  let authGuard: AuthGuardModule
  let mockGetUser: ReturnType<typeof vi.fn>
  let mockSingle: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()

    const supabaseModule = await import('@/lib/supabase/server')
    const supabase = await supabaseModule.createServerSupabaseClient()
    mockGetUser = supabase.auth.getUser
    mockSingle = supabase.from('').select().eq('', '').single

    authGuard = await import('@/lib/utils/auth-guard')
  })

  describe('requireAuth', () => {
    it('should return AuthResult when user is authenticated with profile', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'admin@test.com' } },
        error: null,
      })
      mockSingle.mockResolvedValue({
        data: { id: 'user-1', role: 'admin', restaurant_id: 'rest-1' },
        error: null,
      })

      const result = await authGuard.requireAuth()

      expect(result).not.toBeInstanceOf(NextResponse)
      const authResult = result as AuthResult
      expect(authResult.user.id).toBe('user-1')
      expect(authResult.profile.role).toBe('admin')
    })

    it('should return 401 when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated', status: 401 },
      })

      const result = await authGuard.requireAuth()

      expect(result).toBeInstanceOf(NextResponse)
      const response = result as NextResponse
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 403 when user has no profile', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-2', email: 'noprofile@test.com' } },
        error: null,
      })
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'No profile found' },
      })

      const result = await authGuard.requireAuth()

      expect(result).toBeInstanceOf(NextResponse)
      const response = result as NextResponse
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error.code).toBe('FORBIDDEN')
    })

    it('should reject without valid session token', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token', status: 401 },
      })

      const result = await authGuard.requireAuth()
      expect(result).toBeInstanceOf(NextResponse)
      expect((result as NextResponse).status).toBe(401)
    })

    it('should reject expired sessions', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token expired', status: 401 },
      })

      const result = await authGuard.requireAuth()
      expect(result).toBeInstanceOf(NextResponse)
      expect((result as NextResponse).status).toBe(401)
    })
  })

  describe('requireRole', () => {
    const baseResult: AuthResult = {
      user: { id: 'user-1', email: 'test@test.com' },
      profile: { id: 'user-1', role: 'waiter', restaurant_id: 'rest-1' },
    }

    it('should allow when user has sufficient role (same level)', () => {
      const result = authGuard.requireRole(baseResult, 'waiter')
      expect(result).toBeNull()
    })

    it('should allow admin to access all levels', () => {
      const adminResult: AuthResult = {
        ...baseResult,
        profile: { ...baseResult.profile, role: 'admin' },
      }
      expect(authGuard.requireRole(adminResult, 'admin')).toBeNull()
      expect(authGuard.requireRole(adminResult, 'manager')).toBeNull()
      expect(authGuard.requireRole(adminResult, 'waiter')).toBeNull()
    })

    it('should allow manager to access manager and below', () => {
      const managerResult: AuthResult = {
        ...baseResult,
        profile: { ...baseResult.profile, role: 'manager' },
      }
      expect(authGuard.requireRole(managerResult, 'manager')).toBeNull()
      expect(authGuard.requireRole(managerResult, 'waiter')).toBeNull()
    })

    it('should block waiter from accessing manager routes', () => {
      const result = authGuard.requireRole(baseResult, 'manager')
      expect(result).toBeInstanceOf(NextResponse)
      expect((result as NextResponse).status).toBe(403)
    })

    it('should block cashier from accessing admin routes', () => {
      const cashierResult: AuthResult = {
        ...baseResult,
        profile: { ...baseResult.profile, role: 'cashier' },
      }
      const result = authGuard.requireRole(cashierResult, 'admin')
      expect(result).toBeInstanceOf(NextResponse)
      const body = (result as NextResponse).json as unknown as Promise<{ error: { code: string } }>
      expect(result).toBeDefined()
    })

    it('should block waiter from accessing admin routes', () => {
      const result = authGuard.requireRole(baseResult, 'admin')
      expect(result).toBeInstanceOf(NextResponse)
      expect((result as NextResponse).status).toBe(403)
    })

    it('should return 403 with FORBIDDEN code', async () => {
      const result = authGuard.requireRole(baseResult, 'admin')
      expect(result).toBeInstanceOf(NextResponse)
      const response = result as NextResponse
      const body = await response.json()
      expect(body.error.code).toBe('FORBIDDEN')
    })
  })

  describe('requireAdmin', () => {
    it('should return AuthResult for admin users', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'admin-1', email: 'admin@test.com' } },
        error: null,
      })
      mockSingle.mockResolvedValue({
        data: { id: 'admin-1', role: 'admin', restaurant_id: 'rest-1' },
        error: null,
      })

      const result = await authGuard.requireAdmin()
      expect(result).not.toBeInstanceOf(NextResponse)
      const authResult = result as AuthResult
      expect(authResult.profile.role).toBe('admin')
    })

    it('should block non-admin users with 403', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'waiter-1', email: 'waiter@test.com' } },
        error: null,
      })
      mockSingle.mockResolvedValue({
        data: { id: 'waiter-1', role: 'waiter', restaurant_id: 'rest-1' },
        error: null,
      })

      const result = await authGuard.requireAdmin()
      expect(result).toBeInstanceOf(NextResponse)
      expect((result as NextResponse).status).toBe(403)
    })

    it('should require authentication first', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const result = await authGuard.requireAdmin()
      expect(result).toBeInstanceOf(NextResponse)
      expect((result as NextResponse).status).toBe(401)
    })
  })
})
