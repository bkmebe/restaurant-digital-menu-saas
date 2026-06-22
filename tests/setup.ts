import '@testing-library/jest-dom'
import { vi } from 'vitest'
import './mocks/supabase'

// Set test environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.CHAPA_SECRET_KEY = 'test-chapa-secret-key'
process.env.CHAPA_API_URL = 'https://api.chapa.co/v1'
process.env.ENCRYPTION_KEY = '00000000000000000000000000000000'

// Mock Next.js modules that require edge runtime
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    getAll: vi.fn(() => []),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}))

// Ensure crypto.randomUUID is available
if (typeof globalThis.crypto?.randomUUID !== 'function') {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      }),
    },
    writable: true,
  })
}

// Suppress specific console errors during tests
const originalConsoleError = console.error
console.error = (...args: unknown[]) => {
  const message = typeof args[0] === 'string' ? args[0] : ''
  if (
    message.includes('ReactDOM.render') ||
    message.includes('act(...)') ||
    message.includes('inside a test was not wrapped')
  ) {
    return
  }
  originalConsoleError.call(console, ...args)
}
