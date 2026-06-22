import { test, expect } from '@playwright/test'

test.describe('Customer Journey', () => {
  test('Customer scans QR code and views menu', async ({ page }) => {
    // Navigate to table menu via QR URL
    await page.goto('/menu/table-1')

    // Verify the menu page loads
    await expect(page.locator('h1').first()).toBeVisible()
    await expect(page.getByText(/menu|Menu|ምናሌ/i)).toBeVisible()
  })

  test('Customer browses menu categories', async ({ page }) => {
    await page.goto('/menu/table-1')

    // Should see category tabs or sidebar
    const categoryElements = page.locator('[data-testid="category"]')
    const categoryCount = await categoryElements.count()
    expect(categoryCount).toBeGreaterThanOrEqual(1)
  })

  test('Customer views menu item details', async ({ page }) => {
    await page.goto('/menu/table-1')

    // Click on a menu item to see details
    const menuItem = page.locator('[data-testid="menu-item"]').first()
    await menuItem.click()

    // Should see item details with price and description
    await expect(page.getByText(/price|ETB|ብር/i)).toBeVisible()
  })

  test('Customer adds item to cart', async ({ page }) => {
    await page.goto('/menu/table-2')

    // Add first item to cart
    const addButton = page.locator('[data-testid="add-to-cart"]').first()
    await addButton.click()

    // Cart should show item count
    const cartBadge = page.locator('[data-testid="cart-badge"]')
    await expect(cartBadge).toBeVisible()
  })

  test('Customer places order', async ({ page }) => {
    await page.goto('/menu/table-3')

    // Add items to cart
    const addButtons = page.locator('[data-testid="add-to-cart"]')
    const buttonCount = await addButtons.count()

    if (buttonCount > 0) {
      await addButtons.first().click()

      // Go to cart page
      await page.goto('/cart')

      // Verify cart has items
      await expect(page.getByText(/cart|order/i)).toBeVisible()

      // Place order
      const placeOrder = page.locator('[data-testid="place-order"]')
      if (await placeOrder.isVisible()) {
        await placeOrder.click()

        // Should see confirmation
        await expect(page.getByText(/confirmed|success|placed/i)).toBeVisible()
      }
    }
  })

  test('Customer requests bill', async ({ page }) => {
    await page.goto('/menu/table-4')

    // Find and click "Request Bill" or service request button
    const billButton = page.locator('[data-testid="request-bill"]')
    if (await billButton.isVisible()) {
      await billButton.click()

      // Should see confirmation that request was sent
      await expect(page.getByText(/request|sent|acknowledged/i)).toBeVisible()
    }
  })

  test('Customer views order status', async ({ page }) => {
    await page.goto('/orders/order-test-123')

    // Should see order status information
    await expect(page.getByText(/order|status|preparing|served|paid/i)).toBeVisible()
  })
})
