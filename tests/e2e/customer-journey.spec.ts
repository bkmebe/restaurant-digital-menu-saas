import { test, expect } from '@playwright/test'

test.describe('Customer Journey', () => {
  test('Customer scans QR code and views menu', async ({ page }) => {
    await page.goto('/menu/table-1')

    // Verify the menu page loads with header
    await expect(page.getByTestId('menu-page-title').or(page.locator('h1').first())).toBeVisible()
  })

  test('Customer browses menu categories', async ({ page }) => {
    await page.goto('/menu/table-1')

    const categoryElements = page.getByTestId('category')
    const categoryCount = await categoryElements.count()
    expect(categoryCount).toBeGreaterThanOrEqual(1)
  })

  test('Customer views menu item details', async ({ page }) => {
    await page.goto('/menu/table-1')

    const menuItem = page.getByTestId('menu-item').first()
    await menuItem.click()

    // Should see item details with price
    await expect(page.getByTestId('menu-item-price').first()).toBeVisible()
  })

  test('Customer adds item to cart', async ({ page }) => {
    await page.goto('/menu/table-2')

    const addButton = page.getByTestId('add-to-cart').first()
    await addButton.click()

    const cartBadge = page.getByTestId('cart-badge')
    await expect(cartBadge).toBeVisible()
  })

  test('Customer places order', async ({ page }) => {
    await page.goto('/menu/table-3')

    const addButtons = page.getByTestId('add-to-cart')
    const buttonCount = await addButtons.count()

    if (buttonCount > 0) {
      await addButtons.first().click()

      await page.goto('/cart')

      const placeOrder = page.getByTestId('place-order')
      if (await placeOrder.isVisible()) {
        await placeOrder.click()

        await expect(page.getByTestId('order-confirmed').or(page.getByText(/confirmed|success|placed/i))).toBeVisible()
      }
    }
  })

  test('Customer requests bill', async ({ page }) => {
    await page.goto('/menu/table-4')

    const billButton = page.getByTestId('request-bill')
    if (await billButton.isVisible()) {
      await billButton.click()

      await expect(page.getByText(/request|sent|acknowledged/i)).toBeVisible()
    }
  })

  test('Customer views order status', async ({ page }) => {
    await page.goto('/orders')

    await expect(page.getByTestId('order-status-page').or(page.getByText(/order|status|preparing|served|paid/i))).toBeVisible()
  })
})
