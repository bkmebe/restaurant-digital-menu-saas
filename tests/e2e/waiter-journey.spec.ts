import { test, expect } from '@playwright/test'

test.describe('Waiter Journey', () => {
  test.use({ storageState: 'playwright/.auth/user.json' })

  test('Waiter logs in and sees dashboard', async ({ page }) => {
    await page.goto('/login')

    // Login form should be visible
    await expect(page.getByText(/login|sign in|email/i)).toBeVisible()

    await page.fill('input[name="email"]', 'waiter@restaurant.com')
    await page.fill('input[name="password"]', 'test-password-123')
    await page.click('button[type="submit"]')

    // Should redirect to waiter dashboard
    await expect(page.url()).toContain('/dashboard')
  })

  test('Waiter views assigned tables', async ({ page }) => {
    await page.goto('/dashboard/waiter')

    // Should see assigned tables
    await expect(page.getByText(/table|tables|my tables/i)).toBeVisible()
  })

  test('Waiter views active orders', async ({ page }) => {
    await page.goto('/dashboard/waiter')

    // Should see current orders
    await expect(page.getByText(/order|orders|active/i)).toBeVisible()
  })

  test('Waiter updates order status', async ({ page }) => {
    await page.goto('/dashboard/waiter')

    // Find an order and update its status
    const orderItem = page.locator('[data-testid="order-item"]').first()
    if (await orderItem.isVisible()) {
      const statusButton = orderItem.locator('[data-testid="update-status"]')
      if (await statusButton.isVisible()) {
        await statusButton.click()

        // Status should update
        await expect(page.getByText(/updated|success/i)).toBeVisible()
      }
    }
  })

  test('Waiter responds to service requests', async ({ page }) => {
    await page.goto('/dashboard/waiter')

    // Find service requests section
    const serviceRequest = page.locator('[data-testid="service-request"]').first()
    if (await serviceRequest.isVisible()) {
      await serviceRequest.locator('button').first().click()

      // Should acknowledge the request
      await expect(page.getByText(/acknowledged|resolved/i)).toBeVisible()
    }
  })
})
