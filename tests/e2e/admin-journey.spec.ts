import { test, expect } from '@playwright/test'

test.describe('Admin Journey', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' })

  test('Admin views dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByTestId('sidebar')).toBeVisible()
  })

  test('Admin manages menu items', async ({ page }) => {
    await page.goto('/dashboard/admin/menu')

    const addButton = page.getByTestId('add-menu-item')
    if (await addButton.isVisible()) {
      await addButton.click()
      await expect(page.url()).toContain('/menu/new')
    }
  })

  test('Admin creates new employee', async ({ page }) => {
    await page.goto('/dashboard/admin/employees/new')

    const nameInput = page.getByTestId('employee-name-input')
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test Employee')
      await page.getByTestId('employee-phone-input').fill('+251911234567')
      await page.getByTestId('employee-email-input').fill('employee@habesha.com')
      await page.getByTestId('employee-submit').click()
    }
  })

  test('Admin views payroll dashboard', async ({ page }) => {
    await page.goto('/dashboard/manager/payroll')
    await expect(page.getByTestId('payroll-page')).toBeVisible()
  })

  test('Admin manages branches', async ({ page }) => {
    await page.goto('/dashboard/admin/branches')
    await expect(page.getByTestId('branches-page')).toBeVisible()
  })

  test('Admin views audit logs', async ({ page }) => {
    await page.goto('/dashboard/admin/audit-logs')
    await expect(page.getByTestId('audit-logs-page')).toBeVisible()
  })

  test('Admin manages categories', async ({ page }) => {
    await page.goto('/dashboard/admin/categories')
    await expect(page.getByTestId('categories-page')).toBeVisible()
  })
})
