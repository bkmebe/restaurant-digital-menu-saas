import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'
import type { Mock } from 'vitest'

const mockGetUser: Mock = vi.fn()
const mockFrom: Mock = vi.fn()
const mockSingle: Mock = vi.fn()
const mockRpc: Mock = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
    storage: { from: vi.fn() },
  }),
}))

function sChain(returnData: unknown = null) {
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
    single: mockSingle,
    maybeSingle: vi.fn().mockResolvedValue({ data: returnData, error: null }),
    csv: vi.fn().mockResolvedValue({ data: '', error: null }),
    then: undefined,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSingle.mockResolvedValue({
    data: { id: 'profile-id', role: 'owner', restaurant_id: 'restaurant-a-uuid', organization_id: 'org-uuid' },
    error: null,
  })
})

async function callApiAs(
  role: string,
  routeGetter: () => Promise<{ GET: (req: Request) => Promise<NextResponse> }>,
  url = 'http://localhost:3000/api/organization/analytics',
): Promise<NextResponse> {
  mockGetUser.mockResolvedValue({
    data: {
      user: { id: `${role}-id`, email: `${role}@test.com` },
    },
    error: null,
  })

  mockSingle.mockResolvedValue({
    data: {
      id: `${role}-id`,
      role,
      restaurant_id: 'restaurant-a-uuid',
      organization_id: role === 'owner' || role === 'system_admin' ? 'org-uuid' : null,
    },
    error: null,
  })

  const chain = sChain()
  chain.select.mockReturnThis()
  chain.in.mockReturnThis()
  chain.eq.mockReturnThis()
  chain.gte.mockReturnThis()
  chain.lte.mockReturnThis()
  chain.order.mockReturnThis()
  chain.limit.mockReturnThis()
  chain.then = undefined
  mockFrom.mockReturnValue(chain)

  mockFrom.mockImplementation((table: string) => {
    const c = sChain()
    if (table === 'profiles') {
      c.single = mockSingle
    }
    c.select.mockReturnThis()
    c.in.mockReturnThis()
    c.eq.mockReturnThis()
    c.gte.mockReturnThis()
    c.lte.mockReturnThis()
    c.order.mockReturnThis()
    c.limit.mockReturnThis()
    c.then = undefined
    return c
  })

  const chainWithResults = sChain()
  chainWithResults.select.mockReturnValue(chainWithResults)
  chainWithResults.in.mockResolvedValue({ data: [], error: null, count: 0 })
  chainWithResults.eq.mockReturnValue(chainWithResults)
  chainWithResults.gte.mockReturnValue(chainWithResults)
  chainWithResults.lte.mockReturnValue(chainWithResults)
  chainWithResults.order.mockReturnValue(chainWithResults)
  chainWithResults.limit.mockReturnValue(chainWithResults)
  chainWithResults.single = mockSingle
  mockFrom.mockReturnValue(chainWithResults)
  chainWithResults.then = undefined

  const mod = await routeGetter()
  const req = new Request(url)
  const res = await mod.GET(req)
  return res
}

describe('Organization API RBAC', () => {
  const endpoints = [
    {
      name: 'GET /api/organization/analytics',
      getter: () => import('@/app/api/organization/analytics/route'),
    },
    {
      name: 'GET /api/organization/revenue',
      getter: () => import('@/app/api/organization/revenue/route'),
    },
    {
      name: 'GET /api/organization/branches',
      getter: () => import('@/app/api/organization/branches/route'),
    },
  ]

  for (const { name, getter } of endpoints) {
    describe(`${name}`, () => {
      it('should allow owner to access', async () => {
        const res = await callApiAs('owner', getter)
        expect(res.status).not.toBe(401)
        expect(res.status).not.toBe(403)
      })

      it('should block system_admin from accessing (business data isolation)', async () => {
        const res = await callApiAs('system_admin', getter)
        expect(res.status).toBe(403)
      })

      it('should block admin from accessing', async () => {
        const res = await callApiAs('admin', getter)
        expect(res.status).toBe(403)
      })

      it('should block manager from accessing', async () => {
        const res = await callApiAs('manager', getter)
        expect(res.status).toBe(403)
      })

      it('should block waiter from accessing', async () => {
        const res = await callApiAs('waiter', getter)
        expect(res.status).toBe(403)
      })

      it('should block cashier from accessing', async () => {
        const res = await callApiAs('cashier', getter)
        expect(res.status).toBe(403)
      })

      it('should return 401 when unauthenticated', async () => {
        mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
        const mod = await getter()
        const req = new Request('http://localhost:3000/api/organization/analytics')
        const res = await mod.GET(req)
        expect(res.status).toBe(401)
      })
    })
  }
})
