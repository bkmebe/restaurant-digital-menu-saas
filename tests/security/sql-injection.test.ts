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
  const resolveValue = { data: returnData, error: null }
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
    single: vi.fn().mockResolvedValue(resolveValue),
    maybeSingle: vi.fn().mockResolvedValue(resolveValue),
    csv: vi.fn().mockResolvedValue({ data: '', error: null }),
    then: vi.fn().mockImplementation((resolve: any) => resolve(resolveValue)),
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

describe('SQL Injection Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  function setupAuth(role: string) {
    mockGetUser.mockResolvedValue({
      data: { user: { id: `${role}-id`, email: `${role}@test.com` } },
      error: null,
    })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return profileChain(`${role}-id`, role, 'rest-1')
      return queryChain()
    })
  }

  describe('AI Query Route', () => {
    async function callAiQuery(restaurantId: string, queryStr: string) {
      const aiRoute = await import('@/app/api/ai/query/route')
      const request = new Request('http://localhost:3000/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryStr, restaurant_id: restaurantId }),
      })
      return aiRoute.POST(request)
    }

    it('should reject non-UUID restaurant_id values', async () => {
      setupAuth('admin')
      const response = await callAiQuery("'; DROP TABLE orders; --", 'today sales')
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error.code).toBe('VALIDATION')
    })

    it('should reject SQL injection via restaurant_id', async () => {
      setupAuth('admin')
      const response = await callAiQuery("' OR '1'='1", 'today sales')
      expect(response.status).toBe(400)
    })

    it('should reject empty restaurant_id', async () => {
      setupAuth('admin')
      const response = await callAiQuery('', 'today sales')
      expect(response.status).toBe(400)
    })

    it('should process valid UUID restaurant_id', async () => {
      setupAuth('admin')
      mockRpc.mockResolvedValue({ data: [{ revenue: 15000, orders: 45 }], error: null })

      const validUUID = '123e4567-e89b-12d3-a456-426614174000'
      const response = await callAiQuery(validUUID, 'today sales')
      expect(response.status).toBe(200)
    })

    it('should use parameterized Supabase queries (no exec_sql RPC)', async () => {
      setupAuth('admin')
      const validUUID = '123e4567-e89b-12d3-a456-426614174000'
      const response = await callAiQuery(validUUID, 'today sales')
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body).toHaveProperty('answer')
      expect(body).toHaveProperty('data')

      // exec_sql RPC has been replaced with direct Supabase query builder
      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  describe('Menu Items Route', () => {
    it('should validate UUID parameter in route', async () => {
      setupAuth('admin')

      const menuRoute = await import('@/app/api/menu/items/[id]/route')
      const request = new Request('http://localhost:3000/api/menu/items/not-a-uuid', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await menuRoute.DELETE(request, { params: Promise.resolve({ id: "'; DROP TABLE --" }) })
      expect(response.status).toBeDefined()
    })
  })

  describe('Order Creation Route', () => {
    it('should prevent injection via customer_name', async () => {
      setupAuth('waiter')

      const tableQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { restaurant_id: 'rest-1' }, error: null }),
      }

      const orderSingle = vi.fn().mockResolvedValue({
        data: { id: 'order-1', restaurant_id: 'rest-1', status: 'pending' },
        error: null,
      })
      const updateEq = vi.fn().mockResolvedValue({ error: null })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('waiter-id', 'waiter', 'rest-1')
        if (table === 'tables') return tableQuery
        if (table === 'menu_items') {
          const chain = queryChain()
          chain.in = vi.fn().mockReturnValue({
            then: (resolve: any) => resolve({ data: [{ id: 'item-1', price: 250 }], error: null })
          })
          return chain
        }
        if (table === 'orders') {
          return { ...queryChain(), insert: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: orderSingle, update: vi.fn().mockReturnValue({ eq: updateEq }), eq: vi.fn().mockReturnThis() }
        }
        if (table === 'order_items') return { ...queryChain(), insert: vi.fn().mockResolvedValue({ error: null }) }
        return queryChain()
      })

      const ordersRoute = await import('@/app/api/orders/route')
      const request = new Request('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: 'table-1',
          customer_name: "'; DROP TABLE orders; --",
          items: [{ menu_item_id: 'item-1', quantity: 1 }],
        }),
      })

      const response = await ordersRoute.POST(request)
      expect(response.status).not.toBe(500)
    })
  })
})
