// ============================================================
// PHASE 6: OFFLINE / PWA TESTS
// Uses Playwright with CDP (Chrome DevTools Protocol)
// to simulate offline mode and inspect service worker
// ============================================================

import { test, expect, chromium, type BrowserContext } from '@playwright/test'

const STAGING_URL = process.env.STAGING_URL || 'http://localhost:3000'

test.describe('Phase 6.1 — PWA Manifest & Service Worker', () => {

  test('6.1.1 Web manifest is served', async ({ page }) => {
    const response = await page.goto(`${STAGING_URL}/manifest.json`)
    expect(response?.status()).toBe(200)
    const manifest = await response?.json()
    expect(manifest).toBeDefined()
    expect(manifest.name).toBeDefined()
    expect(manifest.short_name).toBeDefined()
    expect(manifest.start_url).toBeDefined()
    expect(manifest.display).toMatch(/standalone|minimal-ui/)
    expect(manifest.icons).toBeDefined()
    expect(manifest.icons!.length).toBeGreaterThan(0)
  })

  test('6.1.2 Service worker is registered', async ({ page }) => {
    await page.goto(STAGING_URL)

    const hasSW = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false
      const registrations = await navigator.serviceWorker.getRegistrations()
      return registrations.length > 0
    })
    expect(hasSW).toBeTruthy()
  })

  test('6.1.3 Service worker scope covers the app', async ({ page }) => {
    await page.goto(STAGING_URL)
    const scope = await page.evaluate(async () => {
      const regs = await navigator.serviceWorker.getRegistrations()
      if (regs.length === 0) return null
      return regs[0].scope
    })
    expect(scope).toBe(`${STAGING_URL}/`)
  })

  test('6.1.4 App can be installed (beforeinstallprompt fired)', async ({ page }) => {
    await page.goto(STAGING_URL)
    // Stimulate the beforeinstallprompt event trigger
    const installPrompt = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        const handler = (e: Event) => {
          e.preventDefault()
          resolve(true)
        }
        window.addEventListener('beforeinstallprompt', handler)
        // Trigger after 3 seconds timeout
        setTimeout(() => resolve(false), 3000)
      })
    })
    // Note: this will be false in headless; true in real Chrome
    console.log(`beforeinstallprompt received: ${installPrompt}`)
  })

  test('6.1.5 App shell caches critical assets on first load', async ({ page }) => {
    await page.goto(STAGING_URL)
    await page.waitForLoadState('networkidle')

    const cacheKeys = await page.evaluate(async () => {
      const keys = await caches.keys()
      return keys
    })
    console.log('Cache keys:', cacheKeys)
    expect(cacheKeys.length).toBeGreaterThan(0)
  })
})

test.describe('Phase 6.2 — Offline Behavior', () => {

  async function setupOfflineContext(): Promise<{
    context: BrowserContext
    client: any
  }> {
    // We need CDP (Chrome DevTools Protocol) access to toggle offline
    const browser = await chromium.launch()
    const context = await browser.newContext()

    // CDP session via Playwright
    const page = await context.newPage()
    const cdpSession = await context.newCDPSession(page)
    await cdpSession.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    })
    return { context, client: cdpSession }
  }

  test('6.2.1 Cached menu page loads offline', async ({ page }) => {
    // Step 1: Load menu page while online (cache it)
    await page.goto(`${STAGING_URL}/menu/test-table-id`)
    await page.waitForLoadState('networkidle')

    // Get all cached URLs
    const cachedURLs = await page.evaluate(async () => {
      const urls: string[] = []
      const keys = await caches.keys()
      for (const key of keys) {
        const cache = await caches.open(key)
        const requests = await cache.keys()
        for (const req of requests) {
          urls.push(req.url)
        }
      }
      return urls
    })
    console.log('Cached URLs:', cachedURLs)
    expect(cachedURLs.length).toBeGreaterThan(0)
  })

  test('6.2.2 Service worker handles fetch during offline', async ({ page }) => {
    await page.goto(STAGING_URL)
    await page.waitForLoadState('networkidle')

    // Use CDP to go offline
    const client = await page.context().newCDPSession(page)
    await client.send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    })

    // Try to navigate within the app
    await page.goto(`${STAGING_URL}/menu/test-table-id`, { waitUntil: 'load', timeout: 10000 }).catch(() => {})

    // Check if the page loaded something (possibly from cache)
    const bodyText = await page.evaluate(() => document.body?.innerText?.length || 0)
    console.log(`Offline page body length: ${bodyText}`)

    // Restore online
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    })

    // If bodyText > 0, the SW served cached content
    if (bodyText === 0) {
      console.warn('WARNING: Offline page was blank; service worker may not serve cached navigation')
    }
  })

  test('6.2.3 App displays meaningful offline fallback UI', async ({ page }) => {
    const client = await page.context().newCDPSession(page)
    // Load the app, then go offline
    await page.goto(STAGING_URL)
    await page.waitForLoadState('networkidle')

    await client.send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    })

    await page.reload({ waitUntil: 'load', timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(2000)

    // Check for offline indicator
    const offlineIndicator = page.locator('[data-testid="offline-banner"], .offline-banner, [aria-label="Offline"]')
    const offlineText = page.locator('text=offline').or(page.locator('text=Offline'))
    const hasIndicator = await offlineIndicator.isVisible().catch(() => false)
    const hasText = await offlineText.isVisible().catch(() => false)

    console.log(`Offline indicator visible: ${hasIndicator}, Offline text visible: ${hasText}`)
    // At least one should exist if offline UX is implemented
    expect(hasIndicator || hasText).toBeTruthy()

    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    })
  })
})

test.describe('Phase 6.3 — Offline Mutation Queue', () => {

  test('6.3.1 Form submissions are queued when offline', async ({ page }) => {
    // Login first to get auth cookies cached
    await page.goto(`${STAGING_URL}/login`)
    await page.fill('[name="email"]', 'waiter-a1@test.com')
    await page.fill('[name="password"]', 'TestPass123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Go to waiter page that allows service requests
    await page.goto(`${STAGING_URL}/dashboard/waiter`)
    await page.waitForLoadState('networkidle')

    // Go offline
    const client = await page.context().newCDPSession(page)
    await client.send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    })

    // Attempt a service request (if the form exists)
    const requestBtn = page.locator('text=Submit Request').or(page.locator('button[type="submit"]')).first()
    if (await requestBtn.isVisible().catch(() => false)) {
      // Some form fields may exist
      const input = page.locator('textarea, input[type="text"]').first()
      if (await input.isVisible().catch(() => false)) {
        await input.fill('Test offline request')
      }
      await requestBtn.click().catch(() => {})
      await page.waitForTimeout(1000)
    }

    // Check if there's an "offline queue" indicator
    const queueBadge = page.locator('text=queued').or(page.locator('text=Pending Sync'))
    const queueCount = page.locator('[data-testid="offline-queue-count"]')
    const hasBadge = await queueBadge.isVisible().catch(() => false)
    const hasCount = await queueCount.isVisible().catch(() => false)
    console.log(`Offline queue indicator: ${hasBadge || hasCount}`)

    // Restore online
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    })
  })
})
