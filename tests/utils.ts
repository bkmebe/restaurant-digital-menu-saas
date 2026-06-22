import { vi } from 'vitest'
import { mockSupabase } from './mocks/supabase'

// Re-usable test data
export const TEST_RESTAURANT_A = 'restaurant-a-uuid'
export const TEST_RESTAURANT_B = 'restaurant-b-uuid'
export const TEST_ADMIN_ID = 'test-admin-id'
export const TEST_MANAGER_ID = 'test-manager-id'
export const TEST_CASHIER_ID = 'test-cashier-id'
export const TEST_WAITER_ID = 'test-waiter-id'
export const TEST_CUSTOMER_ID = 'test-customer-id'
export const TEST_TABLE_ID = 'test-table-id'
export const TEST_ORDER_ID = 'test-order-id'
export const TEST_MENU_ITEM_ID = 'test-menu-item-id'
export const TEST_EMPLOYEE_ID = 'test-employee-id'

export const mockProfiles = {
  admin: { id: TEST_ADMIN_ID, role: 'admin', restaurant_id: TEST_RESTAURANT_A },
  manager: { id: TEST_MANAGER_ID, role: 'manager', restaurant_id: TEST_RESTAURANT_A },
  cashier: { id: TEST_CASHIER_ID, role: 'cashier', restaurant_id: TEST_RESTAURANT_A },
  waiter: { id: TEST_WAITER_ID, role: 'waiter', restaurant_id: TEST_RESTAURANT_A },
}

export interface AuthSetup {
  user: { id: string; email: string } | null
  profile: { id: string; role: string; restaurant_id: string } | null
  authError?: { message: string; status?: number } | null
}

/**
 * Configure the Supabase mock to simulate a specific auth state.
 * The REAL auth-guard will consume these mock values.
 */
export function setupAuth(options: AuthSetup) {
  const { user, profile, authError } = options

  if (authError || !user) {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: authError || { message: 'Not authenticated', status: 401 },
    })
  } else {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user },
      error: null,
    })
  }

  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'profiles' && user) {
      const builder = createQueryBuilder(profile)
      return builder
    }
    return createQueryBuilder(null)
  })
}

function createQueryBuilder(data: unknown) {
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
    single: vi.fn().mockResolvedValue({ data, error: data ? null : { message: 'Not found' } }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
    csv: vi.fn().mockResolvedValue({ data: '', error: null }),
    url: new URL('http://localhost:3000'),
    headers: {},
  }
}

/**
 * Simulate the caller having a specific role.
 * Used by tests that call route handlers directly.
 * This controls what the REAL auth-guard sees via Supabase.
 */
export function mockRole(role: keyof typeof mockProfiles, restaurantId = TEST_RESTAURANT_A) {
  const profile = { ...mockProfiles[role], restaurant_id: restaurantId }
  setupAuth({
    user: { id: profile.id, email: `${role}@test.com` },
    profile,
  })
}

/**
 * Simulate an unauthenticated caller.
 */
export function mockUnauthenticated() {
  setupAuth({
    user: null,
    profile: null,
    authError: { message: 'Not authenticated', status: 401 },
  })
}

/**
 * Create a minimal Request object for route handler tests.
 */
export function createMockRequest({
  method = 'GET',
  url = 'http://localhost:3000/api/test',
  body,
  headers = {},
}: {
  method?: string
  url?: string
  body?: unknown
  headers?: Record<string, string>
}): Request {
  return {
    method,
    url,
    headers: new Headers(headers),
    json: vi.fn().mockResolvedValue(body || {}),
    text: vi.fn().mockResolvedValue(JSON.stringify(body || {})),
    clone: vi.fn().mockReturnThis(),
    body: null,
    bodyUsed: false,
    cache: 'default' as RequestCache,
    credentials: 'same-origin' as RequestCredentials,
    destination: '' as RequestDestination,
    integrity: '',
    keepalive: false,
    mode: 'cors' as RequestMode,
    redirect: 'follow' as RequestRedirect,
    referrer: '',
    referrerPolicy: '' as ReferrerPolicy,
    signal: new AbortController().signal,
    arrayBuffer: vi.fn(),
    blob: vi.fn(),
    formData: vi.fn(),
  } as unknown as Request
}

/**
 * Reset all mocks between tests.
 */
export function resetMocks() {
  vi.clearAllMocks()
  mockSupabase.from.mockClear()
  mockSupabase.rpc.mockClear()
  mockSupabase.auth.getUser.mockClear()
  mockSupabase.auth.signInWithPassword.mockClear()
  mockSupabase.auth.signOut.mockClear()
  mockSupabase.auth.getSession.mockClear()
  mockSupabase.storage.from.mockClear()
}
