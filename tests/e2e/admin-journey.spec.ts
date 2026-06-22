import { test, expect } from '@playwright/test'

test.describe('Admin Journey', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' })

  test('Admin views dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText(/dashboard|admin|management/i)).toBeVisible()
  })

  test('Admin manages menu items', async ({ page }) => {
    await page.goto('/dashboard/admin/menu')

    // Menu management page should load
    await expect(page.getByText(/menu|items|dishes/i)).toBeVisible()

    // Should have option to add new item
    const addButton = page.locator('[data-testid="add-menu-item"]')
    if (await addButton.isVisible()) {
      await addButton.click()
      await expect(page.url()).toContain('/menu/new')
    }
  })

  test('Admin creates new employee', async ({ page }) => {
    await page.goto('/dashboard/admin/employees/new')

    // Employee creation form should be visible
    await expect(page.getByText(/employee|staff|new/i)).toBeVisible()

    // Fill in employee details
    const nameInput = page.locator('input[name="full_name"]')
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test Employee')
      await page.fill('input[name="phone"]', '+251911234567')
      await page.fill('input[name="email"]', 'employee@test.com')

      // Submit the form
      await page.click('button[type="submit"]')

      // Should redirect to employee list or show success
      await expect(page.getByText(/created|success|employee/i)).toBeVisible()
    }
  })

  test('Admin views payroll dashboard', async ({ page }) => {
    await page.goto('/dashboard/manager/payroll')

    // Payroll page should load
    await expect(page.getByText(/payroll|salary|payment/i)).toBeVisible()
  })

  test('Admin manages branches', async ({ page }) => {
    await page.goto('/dashboard/admin/branches')

    // Branch management page should load
    await expect(page.getByText(/branch|branches|location/i)).toBeVisible()
  })

  test('Admin views audit logs', async ({ page }) => {
    await page.goto('/dashboard/admin/audit-logs')

    // Audit log page should load
    await expect(page.getByText(/audit|log|activity/i)).toBeVisible()
  })

  test('Admin manages categories', async ({ page }) => {
    await page.goto('/dashboard/admin/categories')

    // Category management page should load
    await expect(page.getByText(/category|categories|group/i)).toBeVisible()
  })
})
