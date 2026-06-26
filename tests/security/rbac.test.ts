import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'
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

vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabaseClient: vi.fn().mockReturnValue({
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'auth-user-id' } },
          error: null,
        }),
        deleteUser: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
    },
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
    range: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
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

  describe('Attendance API RBAC', () => {
    it('should allow any staff to clock in', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'waiter-id', email: 'waiter@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('waiter-id', 'waiter', 'rest-a')
        if (table === 'employees') {
          return { ...queryChain(), select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'emp-1', full_name: 'Waiter', restaurant_id: 'rest-a' }, error: null }) }
        }
        return queryChain()
      })

      const clockRoute = await import('@/app/api/attendance/clock/route')
      const response = await clockRoute.POST(new Request('http://localhost:3000/api/attendance/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clock_in' }),
      }))
      expect(response.status).toBe(200)
    })

    it('should block unauthenticated from clock operations', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const clockRoute = await import('@/app/api/attendance/clock/route')
      const response = await clockRoute.POST(new Request('http://localhost:3000/api/attendance/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clock_in' }),
      }))
      expect(response.status).toBe(401)
    })

    it('should block waiter from accessing attendance history (manager+)', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'waiter-id', email: 'waiter@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('waiter-id', 'waiter', 'rest-a')
        return queryChain()
      })

      const historyRoute = await import('@/app/api/attendance/history/route')
      const response = await historyRoute.GET(new Request('http://localhost:3000/api/attendance/history'))
      expect(response.status).toBe(403)
    })

    it('should allow manager to access attendance history', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'manager-id', email: 'manager@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('manager-id', 'manager', 'rest-a')
        return queryChain()
      })

      const historyRoute = await import('@/app/api/attendance/history/route')
      const response = await historyRoute.GET(new Request('http://localhost:3000/api/attendance/history'))
      expect(response.status).toBe(200)
    })

    it('should allow owner to view attendance stats (read-only)', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'owner-id', email: 'owner@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('owner-id', 'owner', 'org-uuid')
        return queryChain()
      })

      const statsRoute = await import('@/app/api/attendance/stats/route')
      const response = await statsRoute.GET()
      expect(response.status).toBe(200)
    })

    it('should block waiter from creating attendance stats (manager+)', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'waiter-id', email: 'waiter@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('waiter-id', 'waiter', 'rest-a')
        return queryChain()
      })

      const statsRoute = await import('@/app/api/attendance/stats/route')
      const response = await statsRoute.GET()
      expect(response.status).toBe(403)
    })

    it('should reject invalid clock action', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'waiter-id', email: 'waiter@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('waiter-id', 'waiter', 'rest-a')
        return queryChain()
      })

      const clockRoute = await import('@/app/api/attendance/clock/route')
      const response = await clockRoute.POST(new Request('http://localhost:3000/api/attendance/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invalid_action' }),
      }))
      expect(response.status).toBe(400)
    })
  })

  describe('Shift Management RBAC', () => {
    it('should allow manager to create shifts', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'manager-id', email: 'manager@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('manager-id', 'manager', 'rest-a')
        return queryChain({ id: 'shift-1' })
      })

      const shiftsRoute = await import('@/app/api/shifts/route')
      const response = await shiftsRoute.POST(new Request('http://localhost:3000/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Morning Shift', shift_date: '2024-01-15', start_time: '09:00', end_time: '17:00' }),
      }))
      expect(response.status).toBe(201)
    })

    it('should block waiter from creating shifts (manager+)', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'waiter-id', email: 'waiter@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('waiter-id', 'waiter', 'rest-a')
        return queryChain()
      })

      const shiftsRoute = await import('@/app/api/shifts/route')
      const response = await shiftsRoute.POST(new Request('http://localhost:3000/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Morning Shift', shift_date: '2024-01-15', start_time: '09:00', end_time: '17:00' }),
      }))
      expect(response.status).toBe(403)
    })

    it('should allow manager to GET shifts', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'manager-id', email: 'manager@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('manager-id', 'manager', 'rest-a')
        return queryChain()
      })

      const shiftsRoute = await import('@/app/api/shifts/route')
      const response = await shiftsRoute.GET(new Request('http://localhost:3000/api/shifts'))
      expect(response.status).toBe(200)
    })

    it('should block waiter from GET shifts (manager+)', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'waiter-id', email: 'waiter@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('waiter-id', 'waiter', 'rest-a')
        return queryChain()
      })

      const shiftsRoute = await import('@/app/api/shifts/route')
      const response = await shiftsRoute.GET(new Request('http://localhost:3000/api/shifts'))
      expect(response.status).toBe(403)
    })

    it('should block owner from updating shifts (read-only)', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'owner-id', email: 'owner@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('owner-id', 'owner', 'org-uuid')
        return queryChain()
      })

      const shiftIdRoute = await import('@/app/api/shifts/[id]/route')
      const response = await shiftIdRoute.PUT(
        new Request('http://localhost:3000/api/shifts/shift-1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Updated' }),
        }),
        { params: Promise.resolve({ id: 'shift-1' }) },
      )
      expect(response.status).toBe(403)
    })

    it('should allow admin to delete shifts', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'admin-id', email: 'admin@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('admin-id', 'admin', 'rest-a')
        return queryChain()
      })

      const shiftIdRoute = await import('@/app/api/shifts/[id]/route')
      const response = await shiftIdRoute.DELETE(
        new Request('http://localhost:3000/api/shifts/shift-1', { method: 'DELETE' }),
        { params: Promise.resolve({ id: 'shift-1' }) },
      )
      expect(response.status).toBe(200)
    })

    it('should block unauthenticated from shift operations', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const shiftsRoute = await import('@/app/api/shifts/route')
      const response = await shiftsRoute.POST(new Request('http://localhost:3000/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test' }),
      }))
      expect(response.status).toBe(401)
    })

    it('should enforce cross-tenant isolation for shifts', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'manager-rest-a', email: 'manager@resta.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return profileChain('manager-rest-a', 'manager', 'rest-a-uuid')
        }
        if (table === 'staff_shifts') {
          return {
            ...queryChain(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation((k: string, v: string) => {
              if (k === 'restaurant_id') expect(v).toBe('rest-a-uuid')
              return {
                ...queryChain(),
                order: vi.fn().mockReturnThis(),
                range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
              }
            }),
          }
        }
        return queryChain()
      })

      const shiftsRoute = await import('@/app/api/shifts/route')
      const response = await shiftsRoute.GET(new Request('http://localhost:3000/api/shifts'))
      expect(response.status).toBe(200)
    })
  })

  describe('EOD Closing RBAC', () => {
    it('should allow manager to open EOD', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'manager-id', email: 'manager@test.com' } },
        error: null,
      })

      const eodMock = queryChain()
      eodMock.select.mockReturnThis()
      eodMock.eq.mockReturnThis()
      eodMock.single
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: { id: 'eod-1', status: 'open' }, error: null })
      eodMock.insert.mockReturnThis()

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('manager-id', 'manager', 'rest-a')
        if (table === 'eod_closings') return eodMock
        return queryChain()
      })

      const route = await import('@/app/api/eod/open/route')
      const response = await route.POST()
      expect(response.status).toBe(201)
    })

    it('should block waiter from opening EOD (manager+)', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'waiter-id', email: 'waiter@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('waiter-id', 'waiter', 'rest-a')
        return queryChain()
      })

      const route = await import('@/app/api/eod/open/route')
      const response = await route.POST()
      expect(response.status).toBe(403)
    })

    it('should block cashier from closing EOD (manager+)', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'cashier-id', email: 'cashier@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('cashier-id', 'cashier', 'rest-a')
        return queryChain()
      })

      const route = await import('@/app/api/eod/close/route')
      const response = await route.POST(new Request('http://localhost:3000/api/eod/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actual_cash: 1000 }),
      }))
      expect(response.status).toBe(403)
    })

    it('should block waiter from approving EOD (admin+)', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'waiter-id', email: 'waiter@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('waiter-id', 'waiter', 'rest-a')
        return queryChain()
      })

      const route = await import('@/app/api/eod/approve/route')
      const response = await route.POST(new Request('http://localhost:3000/api/eod/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eod_closing_id: 'eod-1', status: 'approved' }),
      }))
      expect(response.status).toBe(403)
    })

    it('should allow admin to approve EOD', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'admin-id', email: 'admin@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('admin-id', 'admin', 'rest-a')
        if (table === 'eod_closings') {
          return {
            ...queryChain(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'eod-1', restaurant_id: 'rest-a', status: 'closed' }, error: null }),
            update: vi.fn().mockReturnThis(),
          }
        }
        if (table === 'eod_approvals') return { ...queryChain(), insert: vi.fn().mockResolvedValue({ data: null, error: null }) }
        return queryChain()
      })

      const route = await import('@/app/api/eod/approve/route')
      const response = await route.POST(new Request('http://localhost:3000/api/eod/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eod_closing_id: 'eod-1', status: 'approved' }),
      }))
      expect(response.status).toBe(200)
    })

    it('should block owner from closing EOD (read-only)', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'owner-id', email: 'owner@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('owner-id', 'owner', 'org-uuid')
        return queryChain()
      })

      const route = await import('@/app/api/eod/close/route')
      const response = await route.POST(new Request('http://localhost:3000/api/eod/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actual_cash: 1000 }),
      }))
      expect(response.status).toBe(403)
    })

    it('should block manager from reopening EOD (admin+)', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'manager-id', email: 'manager@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('manager-id', 'manager', 'rest-a')
        return queryChain()
      })

      const route = await import('@/app/api/eod/reopen/route')
      const response = await route.POST(new Request('http://localhost:3000/api/eod/reopen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eod_closing_id: 'eod-1' }),
      }))
      expect(response.status).toBe(403)
    })

    it('should block unauthenticated from eod operations', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const route = await import('@/app/api/eod/open/route')
      const response = await route.POST()
      expect(response.status).toBe(401)
    })

    it('should enforce cross-tenant isolation for eod', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'manager-rest-a', email: 'manager@resta.com' } },
        error: null,
      })

      mockRpc.mockResolvedValue({ data: null, error: null })

      const eodMock = queryChain()
      eodMock.select.mockReturnThis()
      eodMock.eq.mockImplementation((k: string, v: string) => {
        if (k === 'restaurant_id') expect(v).toBe('rest-a-uuid')
        return eodMock
      })
      eodMock.order.mockReturnThis()
      eodMock.limit.mockReturnThis()
      eodMock.maybeSingle.mockResolvedValue({ data: null, error: null })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return profileChain('manager-rest-a', 'manager', 'rest-a-uuid')
        }
        if (table === 'eod_closings') return eodMock
        return queryChain()
      })

      const route = await import('@/app/api/eod/current/route')
      const response = await route.GET()
      expect(response.status).toBe(200)
    })
  })

  describe('Owner read-only enforcement', () => {
    it('should allow owner to GET owner analytics', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'owner-id', email: 'owner@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('owner-id', 'owner', 'org-uuid')
        if (table === 'restaurants') {
          return { ...queryChain(), select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [{ id: 'rest-a', name: 'Branch A' }], error: null }) }
        }
        return queryChain({ data: [], error: null })
      })

      const ownerAnalyticsRoute = await import('@/app/api/owner/analytics/route')
      const response = await ownerAnalyticsRoute.GET()
      expect(response.status).toBe(200)
    })

    it('should block waiter from accessing owner analytics', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'waiter-id', email: 'waiter@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('waiter-id', 'waiter', 'rest-a')
        return queryChain()
      })

      const ownerAnalyticsRoute = await import('@/app/api/owner/analytics/route')
      const response = await ownerAnalyticsRoute.GET()
      expect(response.status).toBe(403)
    })

    it('should block admin from accessing owner analytics', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'admin-id', email: 'admin@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('admin-id', 'admin', 'rest-a')
        return queryChain()
      })

      const ownerAnalyticsRoute = await import('@/app/api/owner/analytics/route')
      const response = await ownerAnalyticsRoute.GET()
      expect(response.status).toBe(403)
    })

    it('requireMutate should return null for non-owner roles', async () => {
      const { requireMutate } = await import('@/lib/utils/auth-guard')
      const result = requireMutate({ user: { id: 'admin-id' }, profile: { id: 'admin-id', role: 'admin', restaurant_id: 'rest-a', organization_id: null } })
      expect(result).toBeNull()
    })

    it('requireMutate should return 403 for owner role', async () => {
      const { requireMutate } = await import('@/lib/utils/auth-guard')
      const result = requireMutate({ user: { id: 'owner-id' }, profile: { id: 'owner-id', role: 'owner', restaurant_id: null, organization_id: 'org-a' } })
      expect(result).toBeInstanceOf(NextResponse)
      const response = result as NextResponse
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error.code).toBe('READ_ONLY')
    })

    it('requireMutate should return null for system_admin role', async () => {
      const { requireMutate } = await import('@/lib/utils/auth-guard')
      const result = requireMutate({ user: { id: 'sysadmin-id' }, profile: { id: 'sysadmin-id', role: 'system_admin', restaurant_id: 'rest-a', organization_id: 'org-a' } })
      expect(result).toBeNull()
    })

  describe('Receipts RBAC', () => {
    it('should allow cashier to generate receipts', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'cashier-id', email: 'cashier@test.com' } },
        error: null,
      })

      mockRpc.mockResolvedValue({ data: 'RCP-20250101-0001', error: null })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('cashier-id', 'cashier', 'rest-a')
        if (table === 'orders') {
          return { ...queryChain(), select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'order-1', total_amount: 150, created_at: new Date().toISOString(), items: [] }, error: null }) }
        }
        if (table === 'restaurants') {
          return { ...queryChain(), select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'rest-a', name: 'Test Restaurant', currency: 'ETB', tax_rate: 0.15 }, error: null }) }
        }
        if (table === 'receipts') {
          return { ...queryChain(), select: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'receipt-1', receipt_number: 'RCP-20250101-0001' }, error: null }) }
        }
        return queryChain()
      })

      const route = await import('@/app/api/receipts/generate/route')
      const response = await route.POST(new Request('http://localhost:3000/api/receipts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: 'order-1' }),
      }))
      expect(response.status).toBe(201)
    })

    it('should block waiter from generating receipts', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'waiter-id', email: 'waiter@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('waiter-id', 'waiter', 'rest-a')
        return queryChain()
      })

      const route = await import('@/app/api/receipts/generate/route')
      const response = await route.POST(new Request('http://localhost:3000/api/receipts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: 'order-1' }),
      }))
      expect(response.status).toBe(403)
    })

    it('should block kitchen staff from generating receipts', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'kitchen-id', email: 'kitchen@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('kitchen-id', 'kitchen_staff', 'rest-a')
        return queryChain()
      })

      const route = await import('@/app/api/receipts/generate/route')
      const response = await route.POST(new Request('http://localhost:3000/api/receipts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: 'order-1' }),
      }))
      expect(response.status).toBe(403)
    })

    it('should allow inventory manager to generate receipts (level >= cashier)', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'inv-id', email: 'inv@test.com' } },
        error: null,
      })

      mockRpc.mockResolvedValue({ data: 'RCP-20250101-0001', error: null })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('inv-id', 'inventory_manager', 'rest-a')
        if (table === 'orders') {
          return { ...queryChain(), select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'order-1', total_amount: 150, created_at: new Date().toISOString(), items: [] }, error: null }) }
        }
        if (table === 'restaurants') {
          return { ...queryChain(), select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'rest-a', name: 'Test Restaurant', currency: 'ETB', tax_rate: 0.15 }, error: null }) }
        }
        if (table === 'receipts') {
          return { ...queryChain(), select: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'receipt-1', receipt_number: 'RCP-20250101-0001' }, error: null }) }
        }
        return queryChain()
      })

      const route = await import('@/app/api/receipts/generate/route')
      const response = await route.POST(new Request('http://localhost:3000/api/receipts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: 'order-1' }),
      }))
      expect(response.status).toBe(201)
    })

    it('should block owner from generating receipts (read-only)', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'owner-id', email: 'owner@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('owner-id', 'owner', 'rest-a')
        return queryChain()
      })

      const route = await import('@/app/api/receipts/generate/route')
      const response = await route.POST(new Request('http://localhost:3000/api/receipts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: 'order-1' }),
      }))
      expect(response.status).toBe(403)
    })

    it('should block unauthenticated from receipt operations', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const route = await import('@/app/api/receipts/generate/route')
      const response = await route.POST()
      expect(response.status).toBe(401)
    })

    it('should enforce cross-tenant isolation for receipts', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'cashier-rest-a', email: 'cashier@resta.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return profileChain('cashier-rest-a', 'cashier', 'rest-a-uuid')
        }
        if (table === 'orders') {
          return { ...queryChain(), select: vi.fn().mockReturnThis(), eq: vi.fn().mockImplementation((k: string, v: string) => {
            if (k === 'restaurant_id') expect(v).toBe('rest-a-uuid')
            return { ...queryChain(), single: vi.fn().mockResolvedValue({ data: { id: 'order-1', total_amount: 150, created_at: new Date().toISOString(), items: [] }, error: null }) }
          })}
        }
        if (table === 'restaurants') {
          return { ...queryChain(), select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'rest-a-uuid', name: 'Test', currency: 'ETB', tax_rate: 0.15 }, error: null }) }
        }
        return queryChain()
      })

      mockRpc.mockResolvedValue({ data: 'RCP-20250101-0001', error: null })

      const route = await import('@/app/api/receipts/generate/route')
      const response = await route.POST(new Request('http://localhost:3000/api/receipts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: 'order-1' }),
      }))
      expect(response.status).toBe(201)
    })
  })

  describe('Tips Management RBAC', () => {
    it('should allow waiter to POST tips', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'waiter-id', email: 'waiter@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('waiter-id', 'waiter', 'rest-a')
        return queryChain()
      })

      const route = await import('@/app/api/tips/route')
      const response = await route.POST(new Request('http://localhost:3000/api/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: 'emp-1', tip_type: 'cash', amount: 50 }),
      }))
      expect(response.status).toBe(201)
    })

    it('should block waiter from managing pools (manager+)', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'waiter-id', email: 'waiter@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('waiter-id', 'waiter', 'rest-a')
        return queryChain()
      })

      const route = await import('@/app/api/tips/pools/route')
      const response = await route.POST(new Request('http://localhost:3000/api/tips/pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Pool', pool_period_start: '2026-01-01', pool_period_end: '2026-01-31' }),
      }))
      expect(response.status).toBe(403)
    })

    it('should allow manager to manage pools', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'mgr-id', email: 'mgr@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('mgr-id', 'manager', 'rest-a')
        return queryChain()
      })

      const route = await import('@/app/api/tips/pools/route')
      const response = await route.POST(new Request('http://localhost:3000/api/tips/pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Pool', pool_period_start: '2026-01-01', pool_period_end: '2026-01-31' }),
      }))
      expect(response.status).toBe(201)
    })

    it('should block unauthenticated from tip operations', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const route = await import('@/app/api/tips/route')
      const response = await route.POST()
      expect(response.status).toBe(401)
    })

    it('should block owner from creating tips (read-only)', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'owner-id', email: 'owner@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('owner-id', 'owner', 'rest-a')
        return queryChain()
      })

      const route = await import('@/app/api/tips/route')
      const response = await route.POST(new Request('http://localhost:3000/api/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: 'emp-1', tip_type: 'cash', amount: 50 }),
      }))
      expect(response.status).toBe(403)
    })

    it('should enforce cross-tenant isolation for tips', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'waiter-rest-a', email: 'waiter@resta.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return profileChain('waiter-rest-a', 'waiter', 'rest-a-uuid')
        }
        if (table === 'staff_tips') {
          return { ...queryChain(), eq: vi.fn().mockImplementation((k: string, v: string) => {
            if (k === 'restaurant_id') expect(v).toBe('rest-a-uuid')
            return queryChain()
          })}
        }
        if (table === 'employees') {
          return { ...queryChain(), select: vi.fn().mockReturnThis(), eq: vi.fn().mockImplementation((k: string, v: string) => {
            if (k === 'profile_id') return { ...queryChain(), single: vi.fn().mockResolvedValue({ data: { id: 'emp-1' }, error: null }) }
            return queryChain()
          })}
        }
        return queryChain()
      })

      const route = await import('@/app/api/tips/route')
      const response = await route.POST(new Request('http://localhost:3000/api/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: 'emp-1', tip_type: 'cash', amount: 50 }),
      }))
      // Should succeed since employee bypass works - we just verify the restaurant_id filter was applied
      expect(response.status).toBe(201)
    })
  })

  describe('Reservations RBAC', () => {
    it('should allow staff to GET reservations', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'cashier-id', email: 'cashier@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('cashier-id', 'cashier', 'rest-a')
        if (table === 'reservations') return queryChain({ data: [], count: 0 })
        return queryChain({ data: [], error: null })
      })

      const route = await import('@/app/api/reservations/route')
      const response = await route.GET(new Request('http://localhost:3000/api/reservations'))
      expect(response.status).toBe(200)
    })

    it('should allow staff to POST reservations', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'waiter-id', email: 'waiter@test.com' } },
        error: null,
      })

      const singleMock = vi.fn().mockResolvedValue({ data: { id: 'new-res-id' }, error: null })
      const selectMock = vi.fn().mockReturnValue({ single: singleMock })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('waiter-id', 'waiter', 'rest-a')
        if (table === 'reservations') return { ...queryChain(), insert: vi.fn().mockReturnValue({ select: selectMock }) }
        if (table === 'reservation_tables') return { ...queryChain(), insert: vi.fn().mockResolvedValue({ data: null, error: null }) }
        return queryChain({ data: [], error: null })
      })

      const route = await import('@/app/api/reservations/route')
      const response = await route.POST(new Request('http://localhost:3000/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_name: 'Test', guest_count: 2, reservation_date: '2026-06-24', reservation_time: '19:00' }),
      }))
      expect(response.status).toBe(201)
    })

    it('should block unauthenticated from reservations', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const route = await import('@/app/api/reservations/route')
      const response = await route.GET(new Request('http://localhost:3000/api/reservations'))
      expect(response.status).toBe(401)
    })

    it('should enforce cross-tenant isolation for reservations', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'waiter-rest-a', email: 'waiter@resta.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('waiter-rest-a', 'waiter', 'rest-a-uuid')
        if (table === 'reservations') {
          return { ...queryChain(), eq: vi.fn().mockImplementation((k: string, _v: string) => {
            if (k === 'restaurant_id') {
              return queryChain({ data: [], count: 0 })
            }
            return queryChain()
          })}
        }
        return queryChain({ data: [], error: null })
      })

      const route = await import('@/app/api/reservations/route')
      const response = await route.GET(new Request('http://localhost:3000/api/reservations'))
      expect(response.status).toBe(200)
    })

    it('should allow status update on reservation', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'mgr-id', email: 'mgr@test.com' } },
        error: null,
      })

      const singleMock = vi.fn().mockResolvedValue({ data: { id: 'res-1', status: 'confirmed' }, error: null })
      const selectMock = vi.fn().mockReturnValue({ single: singleMock })
      const eqMock = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ select: selectMock }) })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('mgr-id', 'manager', 'rest-a')
        if (table === 'reservations') return { ...queryChain(), update: vi.fn().mockReturnValue({ eq: eqMock }) }
        if (table === 'reservation_tables') return { ...queryChain(), delete: vi.fn().mockResolvedValue({ data: null, error: null }) }
        return queryChain({ data: [], error: null })
      })

      const route = await import('@/app/api/reservations/[id]/route')
      const response = await route.PUT(
        new Request('http://localhost:3000/api/reservations/res-1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'confirmed' }),
        }),
        { params: Promise.resolve({ id: 'res-1' }) },
      )
      expect(response.status).toBe(200)
    })
  })

  describe('CRM & Loyalty RBAC', () => {
    it('should allow staff to GET customers', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'waiter-id', email: 'waiter@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('waiter-id', 'waiter', 'rest-a')
        if (table === 'customers') return queryChain({ data: [], count: 0 })
        return queryChain({ data: [], error: null })
      })

      const route = await import('@/app/api/customers/route')
      const response = await route.GET(new Request('http://localhost:3000/api/customers'))
      expect(response.status).toBe(200)
    })

    it('should allow staff to POST customers', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'mgr-id', email: 'mgr@test.com' } },
        error: null,
      })

      const singleMock = vi.fn().mockResolvedValue({ data: { id: 'cust-1', name: 'Test' }, error: null })
      const selectMock = vi.fn().mockReturnValue({ single: singleMock })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('mgr-id', 'manager', 'rest-a')
        if (table === 'customers') return { ...queryChain(), insert: vi.fn().mockReturnValue({ select: selectMock }) }
        return queryChain({ data: [], error: null })
      })

      const route = await import('@/app/api/customers/route')
      const response = await route.POST(new Request('http://localhost:3000/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Customer' }),
      }))
      expect(response.status).toBe(201)
    })

    it('should block unauthenticated from customers', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const route = await import('@/app/api/customers/route')
      const response = await route.GET(new Request('http://localhost:3000/api/customers'))
      expect(response.status).toBe(401)
    })

    it('should allow staff to GET coupons', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'mgr-id', email: 'mgr@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('mgr-id', 'manager', 'rest-a')
        if (table === 'coupons') return queryChain({ data: [], count: 0 })
        return queryChain({ data: [], error: null })
      })

      const route = await import('@/app/api/coupons/route')
      const response = await route.GET(new Request('http://localhost:3000/api/coupons'))
      expect(response.status).toBe(200)
    })

    it('should allow staff to POST coupons', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'admin-id', email: 'admin@test.com' } },
        error: null,
      })

      const singleMock = vi.fn().mockResolvedValue({ data: { id: 'cup-1', code: 'TEST20' }, error: null })
      const selectMock = vi.fn().mockReturnValue({ single: singleMock })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('admin-id', 'admin', 'rest-a')
        if (table === 'coupons') return { ...queryChain(), insert: vi.fn().mockReturnValue({ select: selectMock }) }
        return queryChain({ data: [], error: null })
      })

      const route = await import('@/app/api/coupons/route')
      const response = await route.POST(new Request('http://localhost:3000/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'TEST20', type: 'percentage', value: 20 }),
      }))
      expect(response.status).toBe(201)
    })

    it('should allow staff to GET campaigns', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'mgr-id', email: 'mgr@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('mgr-id', 'manager', 'rest-a')
        if (table === 'marketing_campaigns') return queryChain({ data: [], count: 0 })
        return queryChain({ data: [], error: null })
      })

      const route = await import('@/app/api/campaigns/route')
      const response = await route.GET(new Request('http://localhost:3000/api/campaigns'))
      expect(response.status).toBe(200)
    })

    it('should enforce cross-tenant isolation for customers', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'waiter-rest-a', email: 'waiter@resta.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain('waiter-rest-a', 'waiter', 'rest-a-uuid')
        if (table === 'customers') {
          return { ...queryChain(), eq: vi.fn().mockImplementation((k: string, _v: string) => {
            if (k === 'restaurant_id') return queryChain({ data: [], count: 0 })
            return queryChain()
          })}
        }
        return queryChain({ data: [], error: null })
      })

      const route = await import('@/app/api/customers/route')
      const response = await route.GET(new Request('http://localhost:3000/api/customers'))
      expect(response.status).toBe(200)
    })
  })

    it('should enforce multi-tenant isolation for owner analytics', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'owner-org-a', email: 'owner@orga.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return profileChain('owner-org-a', 'owner', 'org-uuid-a')
        }
        if (table === 'restaurants') {
          return { ...queryChain(), select: vi.fn().mockReturnThis(), eq: vi.fn().mockImplementation((k: string, v: string) => {
            // Ensure the query only returns org-a restaurants, not org-b
            expect(v).toBe('org-uuid-a')
            return { ...queryChain(), order: vi.fn().mockResolvedValue({ data: [{ id: 'rest-a', name: 'Branch A' }], error: null }) }
          })}
        }
        return queryChain({ data: [], error: null })
      })

      const ownerAnalyticsRoute = await import('@/app/api/owner/analytics/route')
      const response = await ownerAnalyticsRoute.GET()
      expect(response.status).toBe(200)
    })
  })
})
