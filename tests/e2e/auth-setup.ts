import { test as setup, expect } from '@playwright/test'

const authFile = 'playwright/.auth/user.json'
const adminAuthFile = 'playwright/.auth/admin.json'

setup('authenticate as regular user', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[name="email"]', 'waiter@restaurant.com')
  await page.fill('input[name="password"]', 'test-password-123')
  await page.click('button[type="submit"]')

  await page.waitForURL('**/dashboard/**')
  await expect(page.getByText('Dashboard')).toBeVisible()

  await page.context().storageState({ path: authFile })
})

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[name="email"]', 'admin@restaurant.com')
  await page.fill('input[name="password"]', 'admin-password-123')
  await page.click('button[type="submit"]')

  await page.waitForURL('**/dashboard/**')
  await expect(page.getByText('Dashboard')).toBeVisible()

  await page.context().storageState({ path: adminAuthFile })
})
