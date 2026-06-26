import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TEST_RESTAURANT_A, TEST_ADMIN_ID, TEST_MANAGER_ID, TEST_WAITER_ID, TEST_CASHIER_ID } from '../utils'
import type { Mock } from 'vitest'

const mockGetUser: Mock = vi.fn()
const mockFrom: Mock = vi.fn()

interface QueryChain {
  select: Mock
  insert: Mock
  update: Mock
  delete: Mock
  eq: Mock
  neq: Mock
  in: Mock
  gte: Mock
  lte: Mock
  order: Mock
  limit: Mock
  single: Mock
  maybeSingle: Mock
  csv: Mock
}

function queryChain(returnData: unknown = null): QueryChain {
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

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: vi.fn(),
  }),
}))

async function importPayroll() {
  return import('@/app/api/payroll/route')
}

function postRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/payroll', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Payroll Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: auth succeeds as manager
    mockGetUser.mockResolvedValue({
      data: { user: { id: TEST_MANAGER_ID, email: 'manager@test.com' } },
      error: null,
    })
  })

  function setupProfileProfile(role: string, userId: string) {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        const chain = queryChain()
        chain.single.mockResolvedValue({
          data: { id: userId, role, restaurant_id: TEST_RESTAURANT_A },
          error: null,
        })
        return chain
      }
      return queryChain(null)
    })
  }

  describe('POST /api/payroll', () => {
    it('should allow admin to create payroll', async () => {
      setupProfileProfile('admin', TEST_ADMIN_ID)
      mockGetUser.mockResolvedValue({
        data: { user: { id: TEST_ADMIN_ID, email: 'admin@test.com' } },
        error: null,
      })

      const payrollInsert = vi.fn().mockReturnThis()
      const payrollSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'payroll-1',
          employee_id: 'emp-1',
          month: 3,
          year: 2024,
          salary: 8000,
          bonuses: 500,
          deductions: 200,
          net_pay: 8300,
          status: 'pending',
        },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          const chain = queryChain()
          chain.single.mockResolvedValue({
            data: { id: TEST_ADMIN_ID, role: 'admin', restaurant_id: TEST_RESTAURANT_A },
            error: null,
          })
          return chain
        }
        if (table === 'payrolls') {
          return { insert: payrollInsert, select: vi.fn().mockReturnThis(), single: payrollSingle, ...queryChain() }
        }
        return queryChain()
      })

      const { POST } = await importPayroll()
      const response = await POST(postRequest({
        restaurant_id: TEST_RESTAURANT_A,
        employee_id: 'emp-1',
        month: 3,
        year: 2024,
        salary: 8000,
        bonuses: 500,
        deductions: 200,
      }))

      expect(response.status).toBe(201)
      const body = await response.json()
      expect(body.data).toBeDefined()
      expect(body.message).toContain('Payroll entry created')
    })

    it('should block waiter from creating payroll', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: TEST_WAITER_ID, email: 'waiter@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          const chain = queryChain()
          chain.single.mockResolvedValue({
            data: { id: TEST_WAITER_ID, role: 'waiter', restaurant_id: TEST_RESTAURANT_A },
            error: null,
          })
          return chain
        }
        return queryChain()
      })

      const { POST } = await importPayroll()
      const response = await POST(postRequest({
        restaurant_id: TEST_RESTAURANT_A,
        employee_id: 'emp-1',
        month: 3,
        year: 2024,
        salary: 8000,
      }))

      expect(response.status).toBe(403)
    })

    it('should block cashier from creating payroll', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: TEST_CASHIER_ID, email: 'cashier@test.com' } },
        error: null,
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          const chain = queryChain()
          chain.single.mockResolvedValue({
            data: { id: TEST_CASHIER_ID, role: 'cashier', restaurant_id: TEST_RESTAURANT_A },
            error: null,
          })
          return chain
        }
        return queryChain()
      })

      const { POST } = await importPayroll()
      const response = await POST(postRequest({
        restaurant_id: TEST_RESTAURANT_A,
        employee_id: 'emp-1',
        month: 3,
        year: 2024,
        salary: 8000,
      }))

      expect(response.status).toBe(403)
    })

    it('should calculate net pay for admin', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: TEST_ADMIN_ID, email: 'admin@test.com' } },
        error: null,
      })
      let capturedBody: Record<string, unknown> = {}
      const payrollInsert = vi.fn().mockImplementation((body: Record<string, unknown>) => {
        capturedBody = body
        return { select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: body, error: null }) }
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          const chain = queryChain()
          chain.single.mockResolvedValue({
            data: { id: TEST_ADMIN_ID, role: 'admin', restaurant_id: TEST_RESTAURANT_A },
            error: null,
          })
          return chain
        }
        if (table === 'payrolls') {
          return { insert: payrollInsert, select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }) }
        }
        return queryChain()
      })

      const { POST } = await importPayroll()
      await POST(postRequest({
        restaurant_id: TEST_RESTAURANT_A,
        employee_id: 'emp-1',
        month: 3,
        year: 2024,
        salary: 10000,
        bonuses: 2000,
        deductions: 1500,
      }))

      expect(capturedBody.net_pay).toBe(10500)
    })

    it('should handle zero bonuses and deductions for admin', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: TEST_ADMIN_ID, email: 'admin@test.com' } },
        error: null,
      })
      let capturedBody: Record<string, unknown> = {}
      const payrollInsert = vi.fn().mockImplementation((body: Record<string, unknown>) => {
        capturedBody = body
        return { select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: body, error: null }) }
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          const chain = queryChain()
          chain.single.mockResolvedValue({
            data: { id: TEST_ADMIN_ID, role: 'admin', restaurant_id: TEST_RESTAURANT_A },
            error: null,
          })
          return chain
        }
        if (table === 'payrolls') {
          return { insert: payrollInsert }
        }
        return queryChain()
      })

      const { POST } = await importPayroll()
      await POST(postRequest({
        restaurant_id: TEST_RESTAURANT_A,
        employee_id: 'emp-1',
        month: 3,
        year: 2024,
        salary: 8000,
      }))

      expect(capturedBody.net_pay).toBe(8000)
    })
  })
})
