import { vi } from 'vitest'

type QueryResult = Record<string, unknown> | Record<string, unknown>[] | null

interface MockQueryBuilder {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  neq: ReturnType<typeof vi.fn>
  in: ReturnType<typeof vi.fn>
  gte: ReturnType<typeof vi.fn>
  lte: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  csv: ReturnType<typeof vi.fn>
  url: URL
  headers: Record<string, string>
}

interface MockStorageFile {
  upload: ReturnType<typeof vi.fn>
  getPublicUrl: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
  download: ReturnType<typeof vi.fn>
  list: ReturnType<typeof vi.fn>
  createSignedUrl: ReturnType<typeof vi.fn>
  createSignedUploadUrl: ReturnType<typeof vi.fn>
}

interface MockAuth {
  getUser: ReturnType<typeof vi.fn>
  getSession: ReturnType<typeof vi.fn>
  signInWithPassword: ReturnType<typeof vi.fn>
  signOut: ReturnType<typeof vi.fn>
  signUp: ReturnType<typeof vi.fn>
  resetPasswordForEmail: ReturnType<typeof vi.fn>
  onAuthStateChange: ReturnType<typeof vi.fn>
  exchangeCodeForSession: ReturnType<typeof vi.fn>
}

export interface MockSupabaseClient {
  from: ReturnType<typeof vi.fn>
  rpc: ReturnType<typeof vi.fn>
  auth: MockAuth
  storage: {
    from: ReturnType<typeof vi.fn>
  }
  channel: ReturnType<typeof vi.fn>
}

function createQueryBuilder(defaultData: QueryResult = null): MockQueryBuilder {
  const builder: MockQueryBuilder = {
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
    single: vi.fn().mockResolvedValue({ data: defaultData, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: defaultData, error: null }),
    csv: vi.fn().mockResolvedValue({ data: '', error: null }),
    url: new URL('http://localhost:3000'),
    headers: {},
  }
  return builder
}

function createMockSupabase(): MockSupabaseClient {
  const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null })

  const mockStorageFile: MockStorageFile = {
    upload: vi.fn().mockResolvedValue({ data: { path: 'test/image.jpg' }, error: null }),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/menu-images/test/image.jpg' } }),
    remove: vi.fn().mockResolvedValue({ data: {}, error: null }),
    download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
    list: vi.fn().mockResolvedValue({ data: [], error: null }),
    createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/signed' }, error: null }),
    createSignedUploadUrl: vi.fn().mockResolvedValue({ data: { url: 'https://example.com/upload' }, error: null }),
  }

  const mockAuth: MockAuth = {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null,
    }),
    getSession: vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'test-token',
          refresh_token: 'test-refresh',
          expires_at: Date.now() + 3600000,
          user: { id: 'test-user-id', email: 'test@example.com' },
        },
      },
      error: null,
    }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: {
        user: { id: 'test-user-id', email: 'test@example.com' },
        session: { access_token: 'test-token' },
      },
      error: null,
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' }, session: null },
      error: null,
    }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    exchangeCodeForSession: vi.fn().mockResolvedValue({
      data: { session: null, user: null },
      error: null,
    }),
  }

  const mock = {
    from: vi.fn().mockImplementation((_table: string) => createQueryBuilder(null)),
    rpc: mockRpc,
    auth: mockAuth,
    storage: {
      from: vi.fn().mockImplementation((_bucket: string) => ({ ...mockStorageFile })),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockResolvedValue({}),
      unsubscribe: vi.fn(),
    }),
  }

  return mock
}

// Default mock instance
export const mockSupabase = createMockSupabase()

// Dynamic mock state - tests can update these to simulate different auth scenarios
export const mockAuthState: {
  user: { id: string; email: string } | null
  profile: { id: string; role: string; restaurant_id: string } | null
  isAuthenticated: boolean
} = {
  user: { id: 'test-admin-id', email: 'admin@test.com' },
  profile: { id: 'test-admin-id', role: 'admin', restaurant_id: 'restaurant-a' },
  isAuthenticated: true,
}

// Mock the server module
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue(mockSupabase),
  createAdminClient: vi.fn().mockResolvedValue(mockSupabase),
  getSession: vi.fn().mockResolvedValue({
    access_token: 'test-token',
    refresh_token: 'test-refresh',
    expires_at: Date.now() + 3600000,
    user: { id: 'test-user-id', email: 'test@example.com' },
  }),
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'test-user-id', email: 'test@example.com' }),
}))

// NOTE: No global vi.mock for @/lib/utils/auth-guard here.
// Each test file controls auth by mocking @/lib/supabase/server, which feeds
// into the REAL auth-guard implementation. This prevents the single biggest
// source of test failures — a global mock returning admin for every test.

export { createMockSupabase, createQueryBuilder }
export type { MockQueryBuilder, MockAuth, MockStorageFile }
