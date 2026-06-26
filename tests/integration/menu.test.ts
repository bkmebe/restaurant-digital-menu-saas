import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'

const mockGetUser: Mock = vi.fn()
const mockFrom: Mock = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: vi.fn(),
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

describe('Menu Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('PUT /api/menu/items/[id]', () => {
    it('should allow admin to update menu item', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'admin-id', email: 'admin@test.com' } },
        error: null,
      })

      const menuSingle = vi.fn().mockResolvedValue({
        data: { id: 'item-1', name: 'Updated Item', price: 299, is_available: true },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('admin-id', 'admin', 'rest-1')
        if (table === 'menu_items') {
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: menuSingle,
          }
        }
        return queryChain()
      })

      const menuRoute = await import('@/app/api/menu/items/[id]/route')
      const request = new Request('http://localhost:3000/api/menu/items/item-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Item', price: 299 }),
      })

      const response = await menuRoute.PUT(request, { params: Promise.resolve({ id: 'item-1' }) })
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data.name).toBe('Updated Item')
    })

    it('should block waiter from updating menu items', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'waiter-id', email: 'waiter@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('waiter-id', 'waiter', 'rest-1')
        return queryChain()
      })

      const menuRoute = await import('@/app/api/menu/items/[id]/route')
      const request = new Request('http://localhost:3000/api/menu/items/item-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: 1 }),
      })

      const response = await menuRoute.PUT(request, { params: Promise.resolve({ id: 'item-1' }) })
      expect(response.status).toBe(403)
    })

    it('should allow admin to update item availability', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'admin-id', email: 'admin@test.com' } },
        error: null,
      })

      const menuSingle = vi.fn().mockResolvedValue({
        data: { id: 'item-1', name: 'Doro Wat', is_available: false },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('admin-id', 'admin', 'rest-1')
        if (table === 'menu_items') {
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: menuSingle,
          }
        }
        return queryChain()
      })

      const menuRoute = await import('@/app/api/menu/items/[id]/route')
      const request = new Request('http://localhost:3000/api/menu/items/item-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: false }),
      })

      const response = await menuRoute.PUT(request, { params: Promise.resolve({ id: 'item-1' }) })
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data.is_available).toBe(false)
    })
  })

  describe('DELETE /api/menu/items/[id]', () => {
    it('should allow admin to delete menu item', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'admin-id', email: 'admin@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('admin-id', 'admin', 'rest-1')
        if (table === 'menu_items') {
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn(),
          }
        }
        return queryChain()
      })

      const menuRoute = await import('@/app/api/menu/items/[id]/route')
      const request = new Request('http://localhost:3000/api/menu/items/item-1', {
        method: 'DELETE',
        headers: {},
      })

      const response = await menuRoute.DELETE(request, { params: Promise.resolve({ id: 'item-1' }) })
      expect(response.status).toBe(200)
    })

    it('should block waiter from deleting menu items', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'waiter-id', email: 'waiter@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('waiter-id', 'waiter', 'rest-1')
        return queryChain()
      })

      const menuRoute = await import('@/app/api/menu/items/[id]/route')
      const request = new Request('http://localhost:3000/api/menu/items/item-1', {
        method: 'DELETE',
        headers: {},
      })

      const response = await menuRoute.DELETE(request, { params: Promise.resolve({ id: 'item-1' }) })
      expect(response.status).toBe(403)
    })

    it('should block cashier from deleting menu items', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'cashier-id', email: 'cashier@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('cashier-id', 'cashier', 'rest-1')
        return queryChain()
      })

      const menuRoute = await import('@/app/api/menu/items/[id]/route')
      const request = new Request('http://localhost:3000/api/menu/items/item-1', {
        method: 'DELETE',
        headers: {},
      })

      const response = await menuRoute.DELETE(request, { params: Promise.resolve({ id: 'item-1' }) })
      expect(response.status).toBe(403)
    })
  })
})
