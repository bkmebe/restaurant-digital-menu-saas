import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { NextResponse } from 'next/server'

import type { TenantContext } from '@/lib/utils/tenant'
import type { Role } from '@/types/common'

// ----- Mocks -----

const mockGetUser: Mock = vi.fn()
const mockFrom: Mock = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: vi.fn(),
  }),
}))

vi.mock('@/lib/utils/tenant', () => {
  let currentTenant: TenantContext | null = null
  let currentError: NextResponse | null = null

  const hierarchy: Record<string, number> = {
    kitchen_staff: 1,
    waiter: 2,
    cashier: 3,
    inventory_manager: 4,
    manager: 5,
    admin: 6,
    owner: 7,
    system_admin: 8,
  }

  return {
    __setTenant: (t: TenantContext | null) => { currentTenant = t; currentError = null },
    __setError: (e: NextResponse) => { currentError = e; currentTenant = null },
    __reset: () => { currentTenant = null; currentError = null },
    requireTenant: vi.fn(async (): Promise<TenantContext | NextResponse> => {
      if (currentError) return currentError
      if (currentTenant) return currentTenant
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 })
    }),
    requireRole: vi.fn((tenant: TenantContext, minimumRole: string): NextResponse | null => {
      if ((hierarchy[tenant.role] ?? 0) < (hierarchy[minimumRole] ?? 0)) {
        return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, { status: 403 })
      }
      return null
    }),
    requireMutate: vi.fn((tenant: TenantContext): NextResponse | null => {
      if (tenant.role === 'owner') {
        return NextResponse.json({ error: { code: 'READ_ONLY', message: 'Owner accounts have read-only access' } }, { status: 403 })
      }
      return null
    }),
  }
})

// ----- Helpers -----

function makeTenant(overrides: Partial<TenantContext> = {}): TenantContext {
  return {
    restaurantId: 'restaurant-a-uuid',
    organizationId: 'org-a-uuid',
    role: 'admin',
    userId: 'admin-id',
    ...overrides,
  }
}

function queryChain(returnData: unknown = null) {
  const thenFn = vi.fn((resolve: (v: unknown) => unknown) => resolve({ data: returnData, error: null }))
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
    single: vi.fn().mockResolvedValue({ data: returnData, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: returnData, error: null }),
    csv: vi.fn().mockResolvedValue({ data: '', error: null }),
    then: thenFn,
    url: new URL('http://localhost:3000'),
    headers: {} as Record<string, string>,
  }
}

function makeBackupRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'backup-1',
    restaurant_id: 'restaurant-a-uuid',
    organization_id: 'org-a-uuid',
    backup_type: 'manual',
    status: 'completed',
    size_bytes: 1048576,
    file_url: 'https://storage.example.com/backups/backup-1.sql.gz',
    checksum: 'abc123',
    started_at: '2026-06-24T10:00:00Z',
    completed_at: '2026-06-24T10:05:00Z',
    expires_at: '2026-07-24T10:00:00Z',
    notes: 'Weekly backup',
    created_by: 'admin-id',
    created_at: '2026-06-24T10:00:00Z',
    updated_at: '2026-06-24T10:05:00Z',
    ...overrides,
  }
}

async function importTenant() {
  const mod = await import('@/lib/utils/tenant') as Record<string, unknown>
  return mod as unknown as {
    __setTenant: (t: TenantContext | null) => void
    __setError: (e: NextResponse) => void
    __reset: () => void
  }
}

// ----- Tests -----

describe('Backups API', () => {
  let tenantModule: { __setTenant: (t: TenantContext | null) => void; __setError: (e: NextResponse) => void; __reset: () => void }
  let backupsRoute: typeof import('@/app/api/backups/route')
  let backupIdRoute: typeof import('@/app/api/backups/[id]/route')

  beforeEach(async () => {
    vi.clearAllMocks()
    const ten = await importTenant()
    tenantModule = ten
    tenantModule.__reset()

    // Fresh import of route modules each test
    vi.resetModules()
    const listRouteModule = await import('@/app/api/backups/route')
    backupsRoute = listRouteModule
    const idRouteModule = await import('@/app/api/backups/[id]/route')
    backupIdRoute = idRouteModule
  })

  describe('GET /api/backups', () => {
    it('should list backups for admin role', async () => {
      tenantModule.__setTenant(makeTenant())

      const backupList = [
        makeBackupRecord({ id: 'backup-1', backup_type: 'daily' }),
        makeBackupRecord({ id: 'backup-2', backup_type: 'manual' }),
      ]
      const chain = queryChain(backupList)
      const rangeSpy = vi.fn().mockReturnThis()
      chain.range = rangeSpy
      const orderSpy = vi.fn().mockReturnThis()
      chain.order = orderSpy

      mockFrom.mockImplementation((table: string) => {
        if (table === 'backup_records') {
          return {
            ...chain,
            select: vi.fn().mockReturnValue({
              ...chain,
              order: orderSpy.mockReturnValue({
                ...chain,
                range: rangeSpy.mockResolvedValue({ data: backupList, count: 2, error: null }),
              }),
            }),
          }
        }
        return queryChain()
      })

      const request = new Request('http://localhost:3000/api/backups')
      const response = await backupsRoute.GET(request)
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data).toHaveLength(2)
      expect(body.total).toBe(2)
    })

    it('should filter backups by status', async () => {
      tenantModule.__setTenant(makeTenant())

      const backupList = [makeBackupRecord({ id: 'backup-3', status: 'in_progress' })]
      const chain = queryChain(backupList)

      mockFrom.mockImplementation((table: string) => {
        if (table === 'backup_records') {
          return {
            ...chain,
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({ data: backupList, count: 1, error: null }),
          }
        }
        return queryChain()
      })

      const request = new Request('http://localhost:3000/api/backups?status=in_progress')
      const response = await backupsRoute.GET(request)
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data).toHaveLength(1)
      expect(body.data[0].status).toBe('in_progress')
    })

    it('should return 403 for non-admin roles', async () => {
      tenantModule.__setTenant(makeTenant({ role: 'waiter' }))

      mockFrom.mockImplementation(() => queryChain())

      const request = new Request('http://localhost:3000/api/backups')
      const response = await backupsRoute.GET(request)
      expect(response.status).toBe(403)
    })

    it('should return 401 when unauthenticated', async () => {
      tenantModule.__setError(
        NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 })
      )

      mockFrom.mockImplementation(() => queryChain())

      const request = new Request('http://localhost:3000/api/backups')
      const response = await backupsRoute.GET(request)
      expect(response.status).toBe(401)
    })

    it('should handle empty list', async () => {
      tenantModule.__setTenant(makeTenant())

      mockFrom.mockImplementation((table: string) => {
        if (table === 'backup_records') {
          return {
            ...queryChain(),
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
          }
        }
        return queryChain()
      })

      const request = new Request('http://localhost:3000/api/backups')
      const response = await backupsRoute.GET(request)
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data).toEqual([])
      expect(body.total).toBe(0)
    })

    it('should handle DB errors', async () => {
      tenantModule.__setTenant(makeTenant())

      mockFrom.mockImplementation((table: string) => {
        if (table === 'backup_records') {
          return {
            ...queryChain(),
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({ data: null, count: null, error: { message: 'DB connection failed' } }),
          }
        }
        return queryChain()
      })

      const request = new Request('http://localhost:3000/api/backups')
      const response = await backupsRoute.GET(request)
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error.message).toContain('Failed to fetch backups')
    })
  })

  describe('POST /api/backups', () => {
    it('should create a backup record', async () => {
      tenantModule.__setTenant(makeTenant())

      const createdBackup = makeBackupRecord({ status: 'in_progress' })
      const chain = queryChain()
      chain.single = vi.fn().mockResolvedValue({ data: createdBackup, error: null })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'backup_records') {
          return {
            ...chain,
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: chain.single,
          }
        }
        return queryChain()
      })

      const request = new Request('http://localhost:3000/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup_type: 'manual', notes: 'Pre-deployment backup' }),
      })

      const response = await backupsRoute.POST(request)
      expect(response.status).toBe(201)
      const body = await response.json()
      expect(body.data.id).toBe('backup-1')
      expect(body.data.status).toBe('in_progress')
      expect(body.data.backup_type).toBe('manual')
    })

    it('should default to manual type when not specified', async () => {
      tenantModule.__setTenant(makeTenant())

      const createdBackup = makeBackupRecord({ backup_type: 'manual', status: 'in_progress' })
      const chain = queryChain()
      chain.single = vi.fn().mockResolvedValue({ data: createdBackup, error: null })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'backup_records') {
          return {
            ...chain,
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: chain.single,
          }
        }
        return queryChain()
      })

      const request = new Request('http://localhost:3000/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await backupsRoute.POST(request)
      expect(response.status).toBe(201)
      const body = await response.json()
      expect(body.data.backup_type).toBe('manual')
    })

    it('should handle DB error on insert', async () => {
      tenantModule.__setTenant(makeTenant())

      const chain = queryChain()
      chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'backup_records') {
          return {
            ...chain,
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: chain.single,
          }
        }
        return queryChain()
      })

      const request = new Request('http://localhost:3000/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup_type: 'manual' }),
      })

      const response = await backupsRoute.POST(request)
      expect(response.status).toBe(500)
    })
  })

  describe('GET /api/backups/[id]', () => {
    it('should return a single backup', async () => {
      tenantModule.__setTenant(makeTenant())

      const backup = makeBackupRecord()

      mockFrom.mockImplementation((table: string) => {
        if (table === 'backup_records') {
          return {
            ...queryChain(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: backup, error: null }),
          }
        }
        return queryChain()
      })

      const request = new Request('http://localhost:3000/api/backups/backup-1')
      const response = await backupIdRoute.GET(request, { params: Promise.resolve({ id: 'backup-1' }) })
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data.id).toBe('backup-1')
    })

    it('should return 404 for non-existent backup', async () => {
      tenantModule.__setTenant(makeTenant())

      mockFrom.mockImplementation((table: string) => {
        if (table === 'backup_records') {
          return {
            ...queryChain(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }
        }
        return queryChain()
      })

      const request = new Request('http://localhost:3000/api/backups/nonexistent')
      const response = await backupIdRoute.GET(request, { params: Promise.resolve({ id: 'nonexistent' }) })
      expect(response.status).toBe(404)
    })
  })

  describe('PUT /api/backups/[id]', () => {
    it('should update backup status to completed', async () => {
      tenantModule.__setTenant(makeTenant())

      const updatedBackup = makeBackupRecord({ status: 'completed', size_bytes: 2097152, file_url: 'https://storage.example.com/backups/backup-1.sql.gz' })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'backup_records') {
          return {
            ...queryChain(),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: updatedBackup, error: null }),
          }
        }
        return queryChain()
      })

      const request = new Request('http://localhost:3000/api/backups/backup-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          size_bytes: 2097152,
          file_url: 'https://storage.example.com/backups/backup-1.sql.gz',
          checksum: 'def456',
          completed_at: '2026-06-24T10:30:00Z',
        }),
      })

      const response = await backupIdRoute.PUT(request, { params: Promise.resolve({ id: 'backup-1' }) })
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data.status).toBe('completed')
    })

    it('should return 400 for empty update', async () => {
      tenantModule.__setTenant(makeTenant())

      mockFrom.mockImplementation(() => queryChain())

      const request = new Request('http://localhost:3000/api/backups/backup-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await backupIdRoute.PUT(request, { params: Promise.resolve({ id: 'backup-1' }) })
      expect(response.status).toBe(400)
    })
  })

  describe('DELETE /api/backups/[id]', () => {
    it('should delete a backup record', async () => {
      tenantModule.__setTenant(makeTenant())

      mockFrom.mockImplementation((table: string) => {
        if (table === 'backup_records') {
          return {
            ...queryChain(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
          }
        }
        return queryChain()
      })

      const request = new Request('http://localhost:3000/api/backups/backup-1', { method: 'DELETE' })
      const response = await backupIdRoute.DELETE(request, { params: Promise.resolve({ id: 'backup-1' }) })
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data.id).toBe('backup-1')
    })

    it('should return 404 when deleting non-existent backup', async () => {
      tenantModule.__setTenant(makeTenant())

      const errorResult = { error: { message: 'Not found' } }
      const chain = {
        ...queryChain(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn((resolve: (v: unknown) => unknown) => resolve(errorResult)),
      }

      mockFrom.mockImplementation((table: string) => {
        if (table === 'backup_records') return chain
        return queryChain()
      })

      const request = new Request('http://localhost:3000/api/backups/nonexistent', { method: 'DELETE' })
      const response = await backupIdRoute.DELETE(request, { params: Promise.resolve({ id: 'nonexistent' }) })
      expect(response.status).toBe(404)
    })
  })

  describe('RBAC enforcement', () => {
    it.each([
      { role: 'waiter' as Role },
      { role: 'cashier' as Role },
      { role: 'manager' as Role },
      { role: 'kitchen_staff' as Role },
      { role: 'inventory_manager' as Role },
    ])('should reject $role from listing backups', async ({ role }) => {
      tenantModule.__setTenant(makeTenant({ role }))

      mockFrom.mockImplementation(() => queryChain())

      const request = new Request('http://localhost:3000/api/backups')
      const response = await backupsRoute.GET(request)
      expect(response.status).toBe(403)
    })


    it.each([
      { role: 'owner' as Role },
    ])('should allow $role to list backups', async ({ role }) => {
      tenantModule.__setTenant(makeTenant({ role }))

      mockFrom.mockImplementation((table: string) => {
        if (table === 'backup_records') {
          return {
            ...queryChain(),
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
          }
        }
        return queryChain()
      })

      const request = new Request('http://localhost:3000/api/backups')
      const response = await backupsRoute.GET(request)
      expect(response.status).toBe(200)
    })
  })
})
