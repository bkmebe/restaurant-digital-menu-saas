import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

const mockRpc = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({
    rpc: mockRpc,
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  }),
}))

describe('Rate Limit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkRateLimit', () => {
    it('should allow requests under the limit', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null })

      const { checkRateLimit } = await import('@/lib/utils/rate-limit')
      const result = await checkRateLimit('test-ip', '/api/auth', 10, 60)

      expect(result).toBeNull()
    })

    it('should block requests exceeding the limit', async () => {
      mockRpc.mockResolvedValue({ data: false, error: null })

      const { checkRateLimit } = await import('@/lib/utils/rate-limit')
      const result = await checkRateLimit('test-ip', '/api/auth', 10, 60)

      expect(result).toBeInstanceOf(NextResponse)
      expect((result as NextResponse).status).toBe(429)
      const body = await (result as NextResponse).json()
      expect(body.error.code).toBe('RATE_LIMITED')
    })

    it('should allow requests when RPC errors (fail open by default)', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

      const { checkRateLimit } = await import('@/lib/utils/rate-limit')
      const result = await checkRateLimit('test-ip', '/api/auth')

      expect(result).toBeNull()
    })

    it('should allow requests when RPC throws (fail open)', async () => {
      mockRpc.mockRejectedValue(new Error('Network error'))

      const { checkRateLimit } = await import('@/lib/utils/rate-limit')
      const result = await checkRateLimit('test-ip', '/api/auth')

      expect(result).toBeNull()
    })
  })

  describe('getRateLimitIdentifier', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      const { getRateLimitIdentifier } = await import('@/lib/utils/rate-limit')
      const request = new Request('http://localhost:3000/api/auth', {
        headers: { 'x-forwarded-for': '192.168.1.1' },
      })

      const identifier = getRateLimitIdentifier(request)
      expect(identifier).toBe('192.168.1.1')
    })

    it('should use first IP from comma-separated list', async () => {
      const { getRateLimitIdentifier } = await import('@/lib/utils/rate-limit')
      const request = new Request('http://localhost:3000/api/auth', {
        headers: { 'x-forwarded-for': '203.0.113.1, 198.51.100.1, 10.0.0.1' },
      })

      const identifier = getRateLimitIdentifier(request)
      expect(identifier).toBe('203.0.113.1')
    })

    it('should fallback to "unknown" when no header present', async () => {
      const { getRateLimitIdentifier } = await import('@/lib/utils/rate-limit')
      const request = new Request('http://localhost:3000/api/auth')

      const identifier = getRateLimitIdentifier(request)
      expect(identifier).toBe('unknown')
    })
  })

  describe('Auth endpoint rate limiting', () => {
    it('should enforce rate limit on login POST', async () => {
      // Import the actual auth route
      const authRoute = await import('@/app/api/auth/route')

      // First set up rate limit to block
      mockRpc.mockResolvedValue({ data: false, error: null })

      const request = new Request('http://localhost:3000/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.0.0.1' },
        body: JSON.stringify({ email: 'test@test.com', password: 'password123' }),
      })

      const response = await authRoute.POST(request)
      expect(response.status).toBe(429)
      const body = await response.json()
      expect(body.error.code).toBe('RATE_LIMITED')
    })

    it('should allow login under rate limit', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null })

      const authRoute = await import('@/app/api/auth/route')
      const mockSupabase = await (await import('@/lib/supabase/server')).createServerSupabaseClient()
      mockSupabase.auth.signInWithPassword = vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' }, session: { access_token: 'token' } },
        error: null,
      })

      const request = new Request('http://localhost:3000/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.0.0.2' },
        body: JSON.stringify({ email: 'admin@test.com', password: 'correct-password' }),
      })

      const response = await authRoute.POST(request)
      expect(response.status).toBe(200)
    })
  })
})
