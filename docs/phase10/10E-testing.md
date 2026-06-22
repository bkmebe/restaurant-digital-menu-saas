# Phase 10E — Testing Strategy

## Test Infrastructure

```bash
# Install test dependencies
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @playwright/test
```

## Unit Tests (Vitest)

### File: `tests/unit/auth.test.ts`
```typescript
import { describe, it, expect, vi } from 'vitest'

describe('Authentication', () => {
  it('login validates email format')
  it('login validates phone format (+251...)')
  it('login rejects empty password')
  it('logout clears session')
  it('useRole returns correct role hierarchy')
})
```

### File: `tests/unit/orders.test.ts`
```typescript
describe('Orders', () => {
  it('creates order with valid items')
  it('rejects order with empty items')
  it('calculates total correctly')
  it('status transitions are valid')
  it('cancellation requires reason')
})
```

### File: `tests/unit/payroll.test.ts`
```typescript
describe('Payroll', () => {
  it('calculates net pay correctly')
  it('validates month range (1-12)')
  it('validates year range')
  it('prevents duplicate payroll entries')
})
```

### File: `tests/unit/employees.test.ts`
```typescript
describe('Employees', () => {
  it('generates unique digital employee ID')
  it('validates Ethiopian phone format')
  it('prevents duplicate employee emails')
  it('respects role assignment constraints')
})
```

### File: `tests/unit/branches.test.ts`
```typescript
describe('Branches', () => {
  it('prevents duplicate branch names per org')
  it('validates branch creation with org context')
})
```

### File: `tests/unit/subscriptions.test.ts`
```typescript
describe('Subscriptions', () => {
  it('prevents concurrent active subscriptions')
  it('validates plan selection')
  it('calculates end date from interval')
})
```

## Integration Tests

### File: `tests/integration/ordering-flow.test.ts`
```typescript
describe('Ordering Flow', () => {
  it('customer browses menu → adds item → views cart → checks out')
  it('order appears in KDS after submission')
  it('kitchen accepts and prepares order')
  it('customer sees real-time status updates')
})
```

### File: `tests/integration/waiter-workflow.test.ts`
```typescript
describe('Waiter Workflow', () => {
  it('waiter views assigned tables')
  it('waiter accepts service request')
  it('waiter marks order as delivered')
  it('waiter processes bill request')
})
```

### File: `tests/integration/payroll-flow.test.ts`
```typescript
describe('Payroll', () => {
  it('manager creates payroll for month')
  it('payroll calculates with bonuses/deductions')
  it('admin views payroll history')
})
```

## E2E Tests (Playwright)

### File: `tests/e2e/customer-journey.spec.ts`
```typescript
import { test, expect } from '@playwright/test'

test('Customer scans QR and orders food', async ({ page }) => {
  // Navigate to table
  await page.goto('/menu/table-1')
  
  // Browse menu
  await expect(page.getByText('Menu')).toBeVisible()
  
  // Add item to cart
  await page.getByText('Add to Cart').first().click()
  
  // View cart
  await page.getByText('Cart').click()
  
  // Submit order
  await page.getByText('Place Order').click()
  
  // Confirm order placed
  await expect(page.getByText('Order Confirmed')).toBeVisible()
})
```

### File: `tests/e2e/staff-journey.spec.ts`
```typescript
test('Waiter manages tables', async ({ page }) => {
  // Login as waiter
  await page.goto('/login')
  await page.fill('[name="email"]', 'waiter@test.com')
  await page.fill('[name="password"]', 'password123')
  await page.getByText('Login').click()
  
  // Navigate to waiter dashboard
  await expect(page.getByText('Waiter Dashboard')).toBeVisible()
  
  // View assigned tables
  await expect(page.getByText('My Tables')).toBeVisible()
})
```

### File: `tests/e2e/admin-journey.spec.ts`
```typescript
test('Admin manages restaurant', async ({ page }) => {
  // Login as admin
  await page.goto('/login')
  await page.fill('[name="email"]', 'admin@test.com')
  await page.fill('[name="password"]', 'password123')
  await page.getByText('Login').click()
  
  // Navigate to menu management
  await page.getByText('Menu').click()
  await page.getByText('Add Item').click()
  
  // Create menu item
  await page.fill('[name="name"]', 'Test Item')
  await page.fill('[name="price"]', '15.99')
  await page.getByText('Save').click()
  
  // Verify created
  await expect(page.getByText('Test Item')).toBeVisible()
})
```

## Coverage Target

| Category | Target | Priority |
|----------|--------|----------|
| Unit tests | 90% | High |
| Integration tests | 80% | High |
| E2E tests | 5 critical paths | High |

## CI Integration

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test           # Unit + integration
      - run: npx playwright test # E2E
      - run: npx vitest run --coverage
```
