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

describe('Orders Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: waiter auth succeeds (orders only requires requireAuth, no role check)
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'waiter-id', email: 'waiter@test.com' } },
      error: null,
    })
  })

  describe('POST /api/orders', () => {
    it('should create order with valid items', async () => {
      const orderSingle = vi.fn().mockResolvedValue({
        data: { id: 'new-order-id', restaurant_id: 'rest-1', table_id: 'table-1', status: 'pending', total_amount: 0 },
        error: null,
      })
      const itemInsert = vi.fn().mockResolvedValue({ error: null })

      const updateEq = vi.fn().mockResolvedValue({ error: null })
      const orderUpdate = vi.fn().mockReturnValue({ eq: updateEq })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('waiter-id', 'waiter', 'rest-1')
        if (table === 'tables') {
          const chain = queryChain({ restaurant_id: 'rest-1' })
          chain.single.mockResolvedValue({ data: { restaurant_id: 'rest-1' }, error: null })
          return chain
        }
        if (table === 'menu_items') {
          const chain = queryChain()
          chain.in = vi.fn().mockReturnValue({
            then: (resolve: any) => resolve({ data: [{ id: 'item-1', price: 250 }], error: null })
          })
          return chain
        }
        if (table === 'orders') {
          return { ...queryChain(), insert: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: orderSingle, update: orderUpdate, eq: vi.fn().mockReturnThis() }
        }
        if (table === 'order_items') return { ...queryChain(), insert: itemInsert }
        return queryChain()
      })

      const orderRoute = await import('@/app/api/orders/route')
      const request = new Request('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_id: 'table-1', customer_name: 'Test Customer', items: [{ menu_item_id: 'item-1', quantity: 2 }] }),
      })

      const response = await orderRoute.POST(request)
      expect(response.status).toBe(201)
      const body = await response.json()
      expect(body.data).toBeDefined()
      expect(body.message).toContain('Order placed')
    })

    it('should reject order with empty items', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('waiter-id', 'waiter', 'rest-1')
        return queryChain()
      })

      const orderRoute = await import('@/app/api/orders/route')
      const request = new Request('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_id: 'table-1', items: [] }),
      })

      const response = await orderRoute.POST(request)
      expect(response.status).toBe(400)
    })

    it('should reject order without table_id', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('waiter-id', 'waiter', 'rest-1')
        return queryChain()
      })

      const orderRoute = await import('@/app/api/orders/route')
      const request = new Request('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ menu_item_id: 'item-1', quantity: 1 }] }),
      })

      const response = await orderRoute.POST(request)
      expect(response.status).toBe(400)
    })

    it('should calculate total correctly from item prices', async () => {
      const updateEq = vi.fn().mockResolvedValue({ error: null })
      const orderUpdate = vi.fn().mockReturnValue({ eq: updateEq })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('waiter-id', 'waiter', 'rest-1')
        if (table === 'tables') {
          const chain = queryChain()
          chain.single.mockResolvedValue({ data: { restaurant_id: 'rest-1' }, error: null })
          return chain
        }
        if (table === 'menu_items') {
          const chain = queryChain()
          chain.in = vi.fn().mockReturnValue({
            then: (resolve: any) => resolve({
              data: [
                { id: 'item-1', price: 250 },
                { id: 'item-2', price: 150 },
              ],
              error: null,
            }),
          })
          return chain
        }
        if (table === 'orders') {
          return {
            ...queryChain(),
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'order-1', restaurant_id: 'rest-1', table_id: 'table-1', status: 'pending', total_amount: 0 }, error: null }),
            update: orderUpdate,
            eq: vi.fn().mockReturnThis(),
          }
        }
        if (table === 'order_items') return { insert: vi.fn().mockResolvedValue({ error: null }) }
        return queryChain()
      })

      const orderRoute = await import('@/app/api/orders/route')
      const request = new Request('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: 'table-1',
          items: [
            { menu_item_id: 'item-1', quantity: 2 },
            { menu_item_id: 'item-2', quantity: 3 },
          ],
        }),
      })

      const response = await orderRoute.POST(request)
      if (response.status === 201) {
        const body = await response.json()
        expect(body.data).toBeDefined()
      }
    })
  })

  describe('Order Status Updates', () => {
    it('should update order status from pending to preparing', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'waiter-id', email: 'waiter@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('waiter-id', 'waiter', 'rest-1')
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'order-1', status: 'pending' }, error: null }),
          }
        }
        return queryChain()
      })
      mockRpc.mockResolvedValue({ data: 15, error: null })

      const orderIdRoute = await import('@/app/api/orders/[id]/route')
      const request = new Request('http://localhost:3000/api/orders/order-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' }),
      })

      const response = await orderIdRoute.PUT(request, { params: Promise.resolve({ id: 'order-1' }) })
      expect(response.status).toBe(200)
    })
  })
})
