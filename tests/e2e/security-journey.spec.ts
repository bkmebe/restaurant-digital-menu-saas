import { test, expect } from '@playwright/test'

test.describe('Security Enforcement', () => {
  test('Unauthenticated user is redirected to login when accessing dashboard', async ({ page }) => {
    // Clear any existing auth
    await page.context().clearCookies()

    // Try to access protected route
    await page.goto('/dashboard/admin/employees')

    // Should be redirected to login
    await expect(page.url()).toContain('/login')
  })

  test('Unauthenticated user cannot access API directly', async ({ page }) => {
    await page.context().clearCookies()

    // Try API call without auth
    const response = await page.request.post('/api/employees', {
      data: { full_name: 'Hacker', role: 'admin' },
    })

    expect(response.status()).toBe(401)
  })

  test('Regular user cannot access admin-only pages', async ({ page }) => {
    // Use waiter auth state
    await page.goto('/dashboard/admin/employees')

    // Should either be redirected or see access denied
    const currentUrl = page.url()
    const isOnAdminPage = currentUrl.includes('/admin/')
    if (isOnAdminPage) {
      // If they made it past the frontend, the API should still block them
      const response = await page.request.post('/api/employees', {
        data: { full_name: 'Escalation Attempt', role: 'admin' },
        headers: { 'Cookie': (await page.context().cookies()).map(c => `${c.name}=${c.value}`).join('; ') },
      })
      expect(response.status()).toBe(403)
    }
  })

  test('SQL injection attempt is rejected', async ({ page }) => {
    // Try SQL injection via the AI query endpoint
    const response = await page.request.post('/api/ai/query', {
      data: {
        query: 'today sales',
        restaurant_id: "'; DROP TABLE orders; --",
      },
    })

    // Should be rejected with validation error (400)
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error.code).toBe('VALIDATION')
  })

  test('Invalid webhook signature is rejected', async ({ page }) => {
    const response = await page.request.post('/api/webhooks/chapa', {
      data: {
        event: 'charge.completed',
        tx_ref: 'RMD-FORGED',
        amount: 999999,
      },
      headers: {
        'x-chapa-signature': 'forged-signature',
      },
    })

    expect(response.status()).toBe(401)
  })

  test('Rate limiting blocks excessive requests', async ({ page }) => {
    // Send many rapid requests to the auth endpoint
    const requests = Array(15).fill(null).map(() =>
      page.request.post('/api/auth', {
        data: { email: 'test@test.com', password: 'wrong' },
      })
    )

    const responses = await Promise.all(requests)
    const rateLimited = responses.filter(r => r.status() === 429)

    // At least some requests should be rate limited
    expect(rateLimited.length).toBeGreaterThan(0)
  })
})
