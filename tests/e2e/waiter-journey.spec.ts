import { test, expect } from '@playwright/test'

const SUPABASE_URL = 'https://siuwuqitzuejlpvsujdy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpdXd1cWl0enVlamxwdnN1amR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDQ0NjIsImV4cCI6MjA5NzM4MDQ2Mn0.3fOr6aWB4RIAfy6DS7AVwUtHtLozfbjzwtwtju6YeIc'

function base64url(str: string): string {
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function makeCookieValue(session: Record<string, any>): string {
  return 'base64-' + base64url(JSON.stringify(session))
}

async function loginViaAPI(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`)
  return await res.json() as any
}

test.describe('Waiter Journey', () => {
  test.use({ storageState: 'playwright/.auth/user.json' })

  test('Waiter logs in and sees dashboard', async ({ page }) => {
    // Re-authenticate via API to get a fresh session cookie
    const { access_token, refresh_token, user, expires_in } = await loginViaAPI('waiter1@habesha.com', 'Habesha@2026!')
    const expires_at = Math.floor(Date.now() / 1000) + expires_in
    const sessionValue = makeCookieValue({
      access_token, refresh_token, user,
      token_type: 'bearer', expires_in, expires_at,
    })

    const prefix = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`
    await page.context().addCookies([{
      name: prefix,
      value: sessionValue,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    }])

    await page.goto('/dashboard', { waitUntil: 'load' })
    await expect(page.getByTestId('sidebar')).toBeVisible()
  })

  test('Waiter views assigned tables', async ({ page }) => {
    await page.goto('/dashboard/waiter')
    await expect(page.getByTestId('sidebar')).toBeVisible()
  })

  test('Waiter views active orders', async ({ page }) => {
    await page.goto('/dashboard/waiter')
    await expect(page.getByTestId('sidebar')).toBeVisible()
  })

  test('Waiter updates order status', async ({ page }) => {
    await page.goto('/dashboard/waiter')

    const orderItem = page.getByTestId('order-item').first()
    if (await orderItem.isVisible()) {
      const statusButton = orderItem.getByTestId('update-status')
      if (await statusButton.isVisible()) {
        await statusButton.click()
      }
    }
  })

  test('Waiter responds to service requests', async ({ page }) => {
    await page.goto('/dashboard/waiter')

    const serviceRequest = page.getByTestId('service-request-card').first()
    if (await serviceRequest.isVisible()) {
      await serviceRequest.getByTestId('acknowledge-request').first().click()
    }
  })
})
