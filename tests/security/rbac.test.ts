import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextResponse } from 'next/server'
import type { Mock } from 'vitest'

const mockGetUser: Mock = vi.fn()
const mockFrom: Mock = vi.fn()
const mockRpc: Mock = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
    storage: { from: vi.fn() },
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

interface RouteModule {
  POST?: (req: Request) => Promise<NextResponse>
  GET?: (req: Request) => Promise<NextResponse>
  PUT?: (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<NextResponse>
  DELETE?: (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<NextResponse>
}

async function callApiAs(
  routeModule: RouteModule,
  method: 'POST' | 'GET' | 'PUT' | 'DELETE',
  role: string,
  url: string,
  body?: unknown,
  params?: Record<string, string>,
): Promise<NextResponse> {
  const profile = { id: `${role}-id`, role, restaurant_id: 'restaurant-a-uuid' }

  mockGetUser.mockResolvedValue({
    data: { user: { id: profile.id, email: `${role}@test.com` } },
    error: null,
  })

  // Ensure profiles query returns the correct role data for the real auth-guard
  const savedImpl = mockFrom.getMockImplementation()
  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') return profileChain(profile.id, profile.role, profile.restaurant_id)
    if (savedImpl) {
      const result = (savedImpl as (t: string) => unknown)(table)
      return result || queryChain()
    }
    return queryChain()
  })

  const request = new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const ctx = { params: Promise.resolve(params || {}) }

  if (method === 'POST' && routeModule.POST) return routeModule.POST(request)
  if (method === 'GET' && routeModule.GET) return routeModule.GET(request)
  if (method === 'PUT' && routeModule.PUT) return routeModule.PUT(request, ctx)
  if (method === 'DELETE' && routeModule.DELETE) return routeModule.DELETE(request, ctx)
  throw new Error(`Method ${method} not implemented in route module`)
}

describe('RBAC Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()

    // Default: mockFrom returns empty query chain for any table
    mockFrom.mockImplementation(() => queryChain(null))
  })

  describe('Unauthenticated access', () => {
    it('should block unauthenticated access to employees API', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const employeesRoute = await import('@/app/api/employees/route')
      const request = new Request('http://localhost:3000/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: 'Hacker', phone: '+251911111111', role: 'admin' }),
      })

      const response = await employeesRoute.POST(request)
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error.code).toBe('UNAUTHORIZED')
    })

    it('should block unauthenticated access to payroll API', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const payrollRoute = await import('@/app/api/payroll/route')
      const request = new Request('http://localhost:3000/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: 'some-id', month: 1, year: 2024, salary: 10000 }),
      })

      const response = await payrollRoute.POST(request)
      expect(response.status).toBe(401)
    })

    it('should block unauthenticated access to menu PUT', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const menuRoute = await import('@/app/api/menu/items/[id]/route')
      const request = new Request('http://localhost:3000/api/menu/items/test-id', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: 1 }),
      })

      const response = await menuRoute.PUT(request, { params: Promise.resolve({ id: 'test-id' }) })
      expect(response.status).toBe(401)
    })
  })

  describe('Role escalation prevention', () => {
    it('should block waiter from creating employees (admin only)', async () => {
      const employeesRoute = await import('@/app/api/employees/route')
      const response = await callApiAs(employeesRoute, 'POST', 'waiter', 'http://localhost:3000/api/employees', {
        full_name: 'Hacker', phone: '+251911111111', role: 'admin',
      })
      expect(response.status).toBe(403)
    })

    it('should block waiter from deleting menu items (admin only)', async () => {
      const menuRoute = await import('@/app/api/menu/items/[id]/route')
      const response = await callApiAs(menuRoute, 'DELETE', 'waiter', 'http://localhost:3000/api/menu/items/item-1', undefined, { id: 'item-1' })
      expect(response.status).toBe(403)
    })

    it('should block waiter from accessing payroll (manager+)', async () => {
      const payrollRoute = await import('@/app/api/payroll/route')
      const response = await callApiAs(payrollRoute, 'POST', 'waiter', 'http://localhost:3000/api/payroll', {
        employee_id: 'emp-1', month: 3, year: 2024, salary: 5000,
      })
      expect(response.status).toBe(403)
    })

    it('should block cashier from accessing analytics (manager+)', async () => {
      const analyticsRoute = await import('@/app/api/analytics/revenue/route')
      const response = await callApiAs(analyticsRoute, 'GET', 'cashier', 'http://localhost:3000/api/analytics/revenue?restaurantId=rest-a')
      expect(response.status).toBe(403)
    })

    it('should NOT block waiter from updating orders (waiter allowed)', async () => {
      const orderRoute = await import('@/app/api/orders/[id]/route')

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('waiter-id', 'waiter', 'restaurant-a-uuid')
        if (table === 'orders') {
          return { ...queryChain(), select: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'order-1', status: 'preparing' }, error: null }) }
        }
        return queryChain()
      })

      const response = await callApiAs(orderRoute, 'PUT', 'waiter', 'http://localhost:3000/api/orders/order-1', { status: 'preparing' }, { id: 'order-1' })
      expect(response.status).not.toBe(403)
    })
  })

  describe('Admin-only endpoints', () => {
    it('should allow admin to create employees', async () => {
      const builder = queryChain({ id: 'emp-1', full_name: 'New Employee', digital_employee_id: 'RMD-TEST-2024-ABC123' })
      builder.insert = vi.fn().mockReturnThis()
      builder.select = vi.fn().mockReturnThis()
      builder.single = vi.fn().mockResolvedValue({
        data: { id: 'emp-1', full_name: 'New Employee', digital_employee_id: 'RMD-TEST-2024-ABC123' },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('admin-id', 'admin', 'restaurant-a-uuid')
        if (table === 'employees') return builder
        return queryChain()
      })

      const employeesRoute = await import('@/app/api/employees/route')
      const response = await callApiAs(employeesRoute, 'POST', 'admin', 'http://localhost:3000/api/employees', {
        full_name: 'New Employee', phone: '+251911234567', email: 'new@test.com',
        role: 'waiter', salary: 5000, hire_date: '2024-01-15', restaurant_id: 'restaurant-a-uuid',
      })

      expect(response.status).toBe(201)
    })

    it('should allow admin to update menu items', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('admin-id', 'admin', 'restaurant-a-uuid')
        if (table === 'menu_items') return { ...queryChain(), update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'item-1', name: 'Updated', price: 299 }, error: null }) }
        return queryChain()
      })

      const menuRoute = await import('@/app/api/menu/items/[id]/route')
      const response = await callApiAs(menuRoute, 'PUT', 'admin', 'http://localhost:3000/api/menu/items/item-1', { price: 299 }, { id: 'item-1' })
      expect(response.status).toBe(200)
    })
  })

  describe('Direct API hardening', () => {
    it('should return 401 when no auth cookie is present', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const employeesRoute = await import('@/app/api/employees/route')
      const request = new Request('http://localhost:3000/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: 'Hacker' }),
      })

      const response = await employeesRoute.POST(request)
      expect(response.status).toBe(401)
    })

    it('should not leak stack traces in error responses', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const employeesRoute = await import('@/app/api/employees/route')
      const request = new Request('http://localhost:3000/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await employeesRoute.POST(request)
      const body = await response.json()
      expect(body).not.toHaveProperty('stack')
      expect(body).not.toHaveProperty('trace')
    })
  })
})
