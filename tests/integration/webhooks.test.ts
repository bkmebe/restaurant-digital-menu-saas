import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'

const mockGetUser: Mock = vi.fn()
const mockFrom: Mock = vi.fn()
const mockRpc: Mock = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
  }),
}))

function queryChain(returnData: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: returnData, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: returnData, error: null }),
    csv: vi.fn().mockResolvedValue({ data: '', error: null }),
  }
}

function profileChain(userId: string, role: string, restaurantId: string) {
  const chain = queryChain()
  chain.single.mockResolvedValue({
    data: { id: userId, role, restaurant_id: restaurantId },
    error: null,
  })
  return chain
}

describe('Payment Webhook Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Chapa Payment Flow', () => {
    it('should initiate payment and create transaction record', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'cashier-id', email: 'cashier@test.com' } },
        error: null,
      })

      const paymentInsert = vi.fn().mockReturnThis()
      const paymentSelect = vi.fn().mockReturnThis()
      const paymentSingle = vi.fn().mockResolvedValue({
        data: { id: 'payment-1', order_id: 'order-1', provider: 'chapa', amount: 1500, status: 'pending', provider_reference: 'RMD-TEST-123' },
        error: null,
      })
      const paymentUpdate = vi.fn().mockReturnThis()
      const paymentEq = vi.fn().mockResolvedValue({ error: null })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('cashier-id', 'cashier', 'rest-1')
        if (table === 'payment_transactions') {
          return { insert: paymentInsert, select: paymentSelect, single: paymentSingle, update: paymentUpdate, eq: paymentEq }
        }
        return queryChain()
      })

      // Mock fetch for the Chapa API call
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ status: 'success', data: { checkout_url: 'https://checkout.chapa.co/xxx' } }),
      }))

      const chapaPaymentRoute = await import('@/app/api/payments/chapa/route')
      const request = new Request('http://localhost:3000/api/payments/chapa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: 'order-1', amount: 1500, email: 'customer@test.com', name: 'Test Customer' }),
      })

      const response = await chapaPaymentRoute.POST(request)
      expect(response.status).toBe(200)
    })

    it('should reject payment initiation from waiter role', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'waiter-id', email: 'waiter@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('waiter-id', 'waiter', 'rest-1')
        return queryChain()
      })

      const chapaPaymentRoute = await import('@/app/api/payments/chapa/route')
      const request = new Request('http://localhost:3000/api/payments/chapa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: 'order-1', amount: 1500 }),
      })

      const response = await chapaPaymentRoute.POST(request)
      expect(response.status).toBe(403)
    })

    it('should handle Chapa API errors gracefully', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'cashier-id', email: 'cashier@test.com' } },
        error: null,
      })

      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('cashier-id', 'cashier', 'rest-1')
        return queryChain()
      })

      const chapaPaymentRoute = await import('@/app/api/payments/chapa/route')
      const request = new Request('http://localhost:3000/api/payments/chapa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: 'order-1', amount: 1500, email: 'test@test.com', name: 'Test' }),
      })

      const response = await chapaPaymentRoute.POST(request)
      expect([400, 500]).toContain(response.status)
    })
  })
})
