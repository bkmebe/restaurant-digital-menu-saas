// ============================================================
// AUTHENTICATION + RBAC/RLS E2E TESTS
// Target: Staging environment
// Run: npx playwright test tests/manual/auth-rbac-e2e.spec.ts
// ============================================================

import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const STAGING_URL = process.env.STAGING_URL || 'http://localhost:3000'
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://test-project.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

interface TestUser {
  email: string
  password: string
  role: string
  restaurantId: string
}

const USERS: TestUser[] = [
  { email: 'admin-a@test.com',      password: 'TestPass123!', role: 'admin',   restaurantId: 'rest-a' },
  { email: 'mgr-a@test.com',        password: 'TestPass123!', role: 'manager', restaurantId: 'rest-a' },
  { email: 'cashier-a@test.com',    password: 'TestPass123!', role: 'cashier', restaurantId: 'rest-a' },
  { email: 'waiter-a1@test.com',    password: 'TestPass123!', role: 'waiter',  restaurantId: 'rest-a' },
  { email: 'admin-b@test.com',      password: 'TestPass123!', role: 'admin',   restaurantId: 'rest-b' },
  // Edge cases
  { email: 'deactivated@test.com',  password: 'TestPass123!', role: 'waiter',  restaurantId: 'rest-a' },
]

// ============================================================
// PHASE 2: AUTHENTICATION TESTS
// ============================================================

test.describe('Phase 2 — Authentication', () => {

  test('2.1 Login — every role succeeds', async ({ page }) => {
    for (const user of USERS) {
      if (user.email === 'deactivated@test.com') continue
      await page.goto(`${STAGING_URL}/login`)
      await page.fill('[name="email"]', user.email)
      await page.fill('[name="password"]', user.password)
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/dashboard/, { timeout: 10000 })
      await expect(page.locator('text=Dashboard')).toBeVisible()
      await page.context().clearCookies()
    }
  })

  test('2.2 Login — invalid credentials rejected', async ({ page }) => {
    await page.goto(`${STAGING_URL}/login`)
    await page.fill('[name="email"]', 'waiter-a1@test.com')
    await page.fill('[name="password"]', 'WRONG_PASSWORD')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Invalid').or(page.locator('text=incorrect'))).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('2.3 Session expiry — redirects to login', async ({ page }) => {
    // Login first
    await page.goto(`${STAGING_URL}/login`)
    await page.fill('[name="email"]', 'admin-a@test.com')
    await page.fill('[name="password"]', 'TestPass123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })

    // Simulate session expiry by clearing auth cookies
    const cookies = await page.context().cookies()
    for (const c of cookies) {
      if (c.name.includes('supabase') || c.name.includes('sb-')) {
        await page.context().removeCookies(c.domain, c.path, c.name)
      }
    }

    // Try to access a protected page
    await page.goto(`${STAGING_URL}/dashboard/admin`)
    await page.waitForURL(/\/login/, { timeout: 10000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('2.4 Protected route — unauthenticated user redirected', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto(`${STAGING_URL}/dashboard/admin`)
    await page.waitForURL(/\/login/, { timeout: 5000 })
  })

  test('2.5 Logout — clears session and redirects', async ({ page }) => {
    await page.goto(`${STAGING_URL}/login`)
    await page.fill('[name="email"]', 'admin-a@test.com')
    await page.fill('[name="password"]', 'TestPass123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })

    await page.goto(`${STAGING_URL}/api/auth/logout`)
    await page.waitForURL(/\/login/, { timeout: 10000 })
    await expect(page).toHaveURL(/\/login/)
  })
})

// ============================================================
// PHASE 3: RBAC + RLS TESTS
// ============================================================

test.describe('Phase 3 — RBAC & RLS Enforcement', () => {

  async function loginAs(page: any, user: TestUser) {
    await page.context().clearCookies()
    await page.goto(`${STAGING_URL}/login`)
    await page.fill('[name="email"]', user.email)
    await page.fill('[name="password"]', user.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
  }

  // ---- RBAC: Role-Based Access ----

  test('3.1 Admin — can access all admin pages', async ({ page }) => {
    await loginAs(page, USERS[0])
    const pages = ['/dashboard/admin', '/dashboard/admin/menu', '/dashboard/admin/employees',
                   '/dashboard/admin/tables', '/dashboard/admin/payments', '/dashboard/admin/audit-logs',
                   '/dashboard/manager', '/dashboard/kitchen', '/dashboard/inventory']
    for (const p of pages) {
      await page.goto(`${STAGING_URL}${p}`)
      await expect(page).not.toHaveURL(/\/login/)
      await expect(page).not.toHaveURL(/403/)
    }
  })

  test('3.2 Waiter — cannot access admin pages', async ({ page }) => {
    await loginAs(page, USERS[3])
    const forbidden = ['/dashboard/admin', '/dashboard/admin/menu', '/dashboard/admin/employees',
                       '/dashboard/manager/reports', '/dashboard/inventory']
    for (const p of forbidden) {
      await page.goto(`${STAGING_URL}${p}`)
      // Should either get 403, redirect, or see access-denied message
      const url = page.url()
      expect(url.includes('/login') || url.includes('/dashboard/waiter') || url.includes('403')).toBeTruthy()
    }
  })

  test('3.3 Cashier — cannot access manager pages', async ({ page }) => {
    await loginAs(page, USERS[2])
    await page.goto(`${STAGING_URL}/dashboard/manager`)
    const url = page.url()
    expect(url.includes('/login') || url.includes('/dashboard/cashier') || url.includes('403')).toBeTruthy()
  })

  test('3.4 Manager — can access manager pages but not admin-only', async ({ page }) => {
    await loginAs(page, USERS[1])
    // Allowed
    await page.goto(`${STAGING_URL}/dashboard/manager`)
    await expect(page).not.toHaveURL(/\/login/)
    // Forbidden
    await page.goto(`${STAGING_URL}/dashboard/admin/employees`)
    expect(page.url().includes('/login') || page.url().includes('/dashboard/manager') || page.url().includes('403')).toBeTruthy()
  })

  // ---- RLS: Cross-Tenant Isolation ----

  test('3.5 RLS — admin-a cannot see rest-b orders via direct API', async ({ page }) => {
    await loginAs(page, USERS[0]) // admin-a@test.com (rest-a)
    const response = await page.request.get(`${STAGING_URL}/api/orders?restaurantId=rest-b`)
    expect(response.status()).toBe(403) // or 200 with empty data
    const body = await response.json()
    if (response.status() === 200) {
      expect(body.data).toBeDefined()
      expect(Array.isArray(body.data)).toBeTruthy()
      // If data returned, it must be filtered to only rest-a
      if (body.data.length > 0) {
        const allAreRestA = body.data.every((o: any) => o.restaurant_id === 'rest-a')
        expect(allAreRestA).toBeTruthy()
      }
    }
  })

  test('3.6 RLS — waiter-a cannot access rest-b menu via Supabase client', async ({ page }) => {
    await loginAs(page, USERS[3]) // waiter-a1@test.com (rest-a)
    const response = await page.request.get(`${STAGING_URL}/api/menu/items?restaurantId=rest-b`)
    expect([200, 403]).toContain(response.status())
    if (response.status() === 200) {
      const body = await response.json()
      if (body.data && body.data.length > 0) {
        const allAreRestA = body.data.every((m: any) => m.restaurant_id === 'rest-a')
        expect(allAreRestA).toBeTruthy()
      }
    }
  })

  test('3.7 RLS — deactivated user blocked', async ({ page }) => {
    await page.goto(`${STAGING_URL}/login`)
    await page.fill('[name="email"]', 'deactivated@test.com')
    await page.fill('[name="password"]', 'TestPass123!')
    await page.click('button[type="submit"]')
    // Should either fail login or redirect away from dashboard
    await expect(page).not.toHaveURL(/\/dashboard\/waiter/)
  })

  // ---- API Endpoint Guards ----

  test('3.8 API — waiter cannot POST /api/payroll', async ({ page }) => {
    await loginAs(page, USERS[3]) // waiter
    const response = await page.request.post(`${STAGING_URL}/api/payroll`, {
      data: { restaurant_id: 'rest-a', employee_id: 'emp-001', month: 6, year: 2026, salary: 10000 }
    })
    expect([401, 403]).toContain(response.status())
  })

  test('3.9 API — cashier cannot DELETE menu items', async ({ page }) => {
    await loginAs(page, USERS[2]) // cashier
    const response = await page.request.delete(`${STAGING_URL}/api/menu/items/some-item-id`)
    expect([401, 403]).toContain(response.status())
  })
})
