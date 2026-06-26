import { test as setup, expect } from '@playwright/test'

setup.setTimeout(120000)

const authFile = 'playwright/.auth/user.json'
const adminAuthFile = 'playwright/.auth/admin.json'
const ownerAuthFile = 'playwright/.auth/owner.json'
const managerAuthFile = 'playwright/.auth/manager.json'
const cashierAuthFile = 'playwright/.auth/cashier.json'
const kitchenAuthFile = 'playwright/.auth/kitchen.json'
const inventoryAuthFile = 'playwright/.auth/inventory.json'

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

async function setupAuth(page: any, email: string, password: string, storagePath: string) {
  // Login via REST API
  const { access_token, refresh_token, user, expires_in } = await loginViaAPI(email, password)
  const expires_at = Math.floor(Date.now() / 1000) + expires_in
  const sessionValue = makeCookieValue({
    access_token, refresh_token, user,
    token_type: 'bearer', expires_in, expires_at,
  })

  const prefix = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`

  // Set auth cookie BEFORE navigating
  await page.context().addCookies([{
    name: prefix,
    value: sessionValue,
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
  }])

  // Navigate directly to dashboard
  await page.goto('/dashboard', { waitUntil: 'load', timeout: 30000 })
    .catch(async () => {
      console.log('goto threw, current URL:', page.url())
    })

  console.log(`Final URL: ${page.url()}`)

  if (page.url().includes('/login')) {
    throw new Error(`Auth setup failed for ${email}: landed at login page`)
  }

  // Debug: check if cookie is accessible from JS
  const jsCookies = await page.evaluate(() => document.cookie)
  console.log(`document.cookie contains sb token: ${jsCookies.includes('sb-')}`)
  const match = jsCookies.match(/sb-[^-]+-auth-token=([^;]+)/)
  if (match) {
    console.log(`Cookie value length: ${match[1].length}`)
    console.log(`Cookie value prefix: ${match[1].substring(0, 50)}...`)
  }

  // Wait for sidebar to render — proves client-side auth works
  await expect(page.getByTestId('sidebar')).toBeVisible({ timeout: 20000 })

  // Success - save storage state
  await page.context().storageState({ path: storagePath })
  console.log(`Auth successful for ${email} -> ${storagePath}`)
}

setup('authenticate as regular user (waiter)', async ({ page }) => {
  setup.setTimeout(90000)
  await setupAuth(page, 'waiter1@habesha.com', 'Habesha@2026!', authFile)
})

setup('authenticate as admin', async ({ page }) => {
  setup.setTimeout(90000)
  await setupAuth(page, 'admin@habesha.com', 'Habesha@2026!', adminAuthFile)
})

setup('authenticate as owner (Habesha)', async ({ page }) => {
  setup.setTimeout(90000)
  await setupAuth(page, 'owner@habesha.com', 'Habesha@2026!', ownerAuthFile)
})

setup('authenticate as manager (Habesha)', async ({ page }) => {
  setup.setTimeout(90000)
  await setupAuth(page, 'manager@habesha.com', 'Habesha@2026!', managerAuthFile)
})

setup('authenticate as cashier (Habesha)', async ({ page }) => {
  setup.setTimeout(90000)
  await setupAuth(page, 'cashier1@habesha.com', 'Habesha@2026!', cashierAuthFile)
})

setup('authenticate as kitchen staff (Habesha)', async ({ page }) => {
  setup.setTimeout(90000)
  await setupAuth(page, 'kitchen1@habesha.com', 'Habesha@2026!', kitchenAuthFile)
})

setup('authenticate as inventory manager (Habesha)', async ({ page }) => {
  setup.setTimeout(90000)
  await setupAuth(page, 'inventory1@habesha.com', 'Habesha@2026!', inventoryAuthFile)
})
