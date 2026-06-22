# Testing Strategy — Restaurant Digital Menu System

## 1. Testing Architecture

### 1.1 Functional Testing (UI + API Flows)

```
Layer          Tool              Scope
─────          ────              ─────
E2E            Playwright        Critical user journeys across roles
API            Vitest + Supertest All REST endpoints (orders, menu, payroll, webhooks)
Component      Storybook/React    UI components in isolation (cards, tables, badges)
```

**UI flow coverage per role:**

| Role | Flows |
|------|-------|
| Customer | Browse menu → Add to cart → Request waiter → Request bill |
| Waiter | Login → View assigned tables → Acknowledge service request → Track order status |
| Cashier | Login → View open orders → Process payment → Close order |
| Manager | Login → View revenue → Check popular items → Review payroll → Export report |
| Admin | Login → CRUD menu items → Manage employees → Configure tables → View audit logs |

### 1.2 Integration Testing (Next.js + Supabase)

Test the real boundary between Next.js API routes and Supabase:

```
API Route                    Supabase Interaction           Test Focus
─────────                    ──────────────────             ──────────
POST /api/orders             Insert orders + order_items     RLS row-level security
GET  /api/analytics/revenue  Query mv_daily_sales           Materialized view freshness
POST /api/webhooks/chapa     Upsert payment_transactions    Idempotency + signature verify
POST /api/payroll            Insert payroll rows            Month/year uniqueness constraint
```

### 1.3 Security Testing

Tools:
- **OWASP ZAP** — automated DAST scanning against staging
- **Custom Vitest suites** — RBAC matrix, RLS isolation, webhook replay
- **Supabase local** — direct SQL assertions after each operation

### 1.4 Stress / Load Testing

Tool: **k6** (or Artillery)

```
Scenarios:
  - Ramp-up: 0 → 200 concurrent users over 60s
  - Spike: 50 → 500 users in 10s (simulating lunch rush)
  - Soak: 100 users sustained for 30 minutes
```

### 1.5 Offline / PWA Testing

Tool: **Playwright with network throttling** + Chrome DevTools Protocol

```
States:
  - Full offline (No connectivity)
  - Intermittent (Drop every 3rd request)
  - Latent (500ms+ delay on all requests)
```

---

## 2. Sample Data Generation Plan

### 2.1 Multi-Tenant Structure

```json
{
  "organizations": [
    { "id": "org-001", "name": "Buna Hospitality Group" },
    { "id": "org-002", "name": "Lalibela Eateries" }
  ],
  "branches": [
    { "id": "branch-001", "org_id": "org-001", "name": "Buna Cafe - Bole" },
    { "id": "branch-002", "org_id": "org-001", "name": "Buna Cafe - Summit" },
    { "id": "branch-003", "org_id": "org-002", "name": "Lalibela - Merkato" }
  ],
  "restaurants": [
    { "id": "rest-a", "org_id": "org-001", "branch_id": "branch-001", "name": "Buna Cafe Bole" },
    { "id": "rest-b", "org_id": "org-001", "branch_id": "branch-002", "name": "Buna Cafe Summit" },
    { "id": "rest-c", "org_id": "org-002", "branch_id": "branch-003", "name": "Lalibela Merkato" }
  ]
}
```

### 2.2 Users — All Roles

```json
[
  { "email": "admin-a@test.com",   "role": "admin",   "restaurant_id": "rest-a" },
  { "email": "admin-b@test.com",   "role": "admin",   "restaurant_id": "rest-b" },
  { "email": "mgr-a@test.com",     "role": "manager", "restaurant_id": "rest-a" },
  { "email": "cashier-a@test.com", "role": "cashier", "restaurant_id": "rest-a" },
  { "email": "waiter-a1@test.com", "role": "waiter",  "restaurant_id": "rest-a" },
  { "email": "waiter-a2@test.com", "role": "waiter",  "restaurant_id": "rest-a" },
  { "email": "waiter-b1@test.com", "role": "waiter",  "restaurant_id": "rest-b" },
  { "email": "chef-a@test.com",    "role": "chef",    "restaurant_id": "rest-a" },
  { "email": "cross-tenant@test.com", "role": "waiter", "restaurant_id": "rest-c" }
]
```

**Edge-case users:**

```json
[
  { "email": "orphan@test.com",      "role": "admin",   "restaurant_id": null },
  { "email": "deactivated@test.com", "role": "waiter",  "restaurant_id": "rest-a", "is_active": false },
  { "email": "no-org@test.com",      "role": "manager", "restaurant_id": "rest-a", "organization_id": null }
]
```

### 2.3 Menu Items

```json
[
  { "id": "item-001", "restaurant_id": "rest-a", "category": "Coffee",  "name": "Espresso",       "price": 45,  "is_available": true },
  { "id": "item-002", "restaurant_id": "rest-a", "category": "Coffee",  "name": "Cappuccino",     "price": 65,  "is_available": true },
  { "id": "item-003", "restaurant_id": "rest-a", "category": "Food",    "name": "Kitfo",          "price": 350, "is_available": true },
  { "id": "item-004", "restaurant_id": "rest-a", "category": "Food",    "name": "Tibs",           "price": 280, "is_available": true },
  { "id": "item-005", "restaurant_id": "rest-a", "category": "Juice",   "name": "Mango Juice",    "price": 80,  "is_available": true },
  { "id": "item-006", "restaurant_id": "rest-b", "category": "Coffee",  "name": "Macchiato",      "price": 55,  "is_available": true },
  { "id": "item-007", "restaurant_id": "rest-b", "category": "Food",    "name": "Shiro",          "price": 180, "is_available": true }
]
```

**Edge cases:**

```json
[
  { "id": "item-unavail", "restaurant_id": "rest-a", "name": "Out of Stock Item",  "price": 100, "is_available": false },
  { "id": "item-zero",    "restaurant_id": "rest-a", "name": "Free Water",         "price": 0,   "is_available": true },
  { "id": "item-empty-cat","restaurant_id": "rest-a", "name": "No Category Item",  "price": 50,  "category": null }
]
```

### 2.4 Orders — All States

```json
[
  { "id": "ord-001", "restaurant_id": "rest-a", "table_id": "tbl-01", "status": "pending",   "total_amount": 450, "created_at": "2026-06-20T12:00:00Z" },
  { "id": "ord-002", "restaurant_id": "rest-a", "table_id": "tbl-01", "status": "preparing", "total_amount": 280, "created_at": "2026-06-20T12:15:00Z" },
  { "id": "ord-003", "restaurant_id": "rest-a", "table_id": "tbl-02", "status": "ready",     "total_amount": 780, "created_at": "2026-06-20T12:30:00Z" },
  { "id": "ord-004", "restaurant_id": "rest-a", "table_id": "tbl-03", "status": "completed", "total_amount": 560, "created_at": "2026-06-20T11:00:00Z" },
  { "id": "ord-005", "restaurant_id": "rest-a", "table_id": "tbl-04", "status": "cancelled", "total_amount": 0,   "created_at": "2026-06-20T10:30:00Z" },
  { "id": "ord-006", "restaurant_id": "rest-b", "table_id": "tbl-10", "status": "pending",   "total_amount": 320, "created_at": "2026-06-20T12:45:00Z" }
]
```

**Edge-case orders:**

```json
[
  { "id": "ord-empty",    "restaurant_id": "rest-a", "table_id": "tbl-05", "status": "pending", "total_amount": 0 },
  { "id": "ord-giant",    "restaurant_id": "rest-a", "table_id": "tbl-06", "status": "pending", "total_amount": 999999.99 },
  { "id": "ord-negative", "restaurant_id": "rest-a", "table_id": "tbl-07", "status": "cancelled", "total_amount": -100 },
  { "id": "ord-orphan",   "restaurant_id": null,      "table_id": null,     "status": "pending", "total_amount": 100 }
]
```

### 2.5 Payroll Records

```json
[
  { "id": "pay-001", "restaurant_id": "rest-a", "employee_id": "emp-001", "month": 6, "year": 2026, "salary": 15000, "bonuses": 2000, "deductions": 1500, "net_pay": 15500, "status": "paid" },
  { "id": "pay-002", "restaurant_id": "rest-a", "employee_id": "emp-002", "month": 6, "year": 2026, "salary": 8000,  "bonuses": 0,    "deductions": 500,  "net_pay": 7500,  "status": "pending" },
  { "id": "pay-003", "restaurant_id": "rest-b", "employee_id": "emp-005", "month": 6, "year": 2026, "salary": 12000, "bonuses": 1000, "deductions": 1000, "net_pay": 12000, "status": "pending" }
]
```

### 2.6 Subscriptions

```json
[
  { "id": "sub-001", "organization_id": "org-001", "plan": "premium",   "status": "active",    "billing_period_start": "2026-01-01", "billing_period_end": "2026-12-31" },
  { "id": "sub-002", "organization_id": "org-002", "plan": "basic",     "status": "active",    "billing_period_start": "2026-06-01", "billing_period_end": "2026-07-01" },
  { "id": "sub-expired", "organization_id": "org-001", "plan": "enterprise", "status": "expired", "billing_period_start": "2025-01-01", "billing_period_end": "2025-12-31" }
]
```

### 2.7 High-Volume Data for Stress Testing

Use a script to generate:

```
restaurants:  50
users/role:   200 per restaurant (1000 per tenant × 2 tenants = 2000 users)
menu items:   100 per restaurant
orders:       10,000 per restaurant (mixed statuses, spanning 90 days)
payrolls:     12 months × employee count
audit_logs:   50,000 rows (bulk insert with random actions)
```

**Tenant isolation guarantee:** Restaurant `rest-a` data must never appear in queries for `rest-b`. RLS policies enforce `restaurant_id = auth_restaurant_id()`.

---

## 3. Image Strategy

Use **public placeholder APIs** — zero copyright risk, no local file storage needed.

| Category | Source | URL Pattern | Example |
|----------|--------|-------------|---------|
| Menu items | picsum.photos | `https://picsum.photos/seed/{item-name}/400/300` | `https://picsum.photos/seed/kitfo/400/300` |
| Restaurants | picsum.photos | `https://picsum.photos/seed/{rest-name}/800/400` | `https://picsum.photos/seed/buna-cafe/800/400` |
| User avatars | i.pravatar.cc | `https://i.pravatar.cc/150?u={email}` | `https://i.pravatar.cc/150?u=waiter-a1@test.com` |
| QR codes | API QR server | `https://api.qrserver.com/v1/create-qr-code/?data={table-url}&size=200x200` | `https://api.qrserver.com/v1/create-qr-code/?data=https://menu.example.com/table-01&size=200x200` |

**Edge case images:**

- Missing image → assert fallback/placeholder renders
- Corrupt URL → assert 404 handled gracefully
- Oversized image (10MB+) → assert compression or rejection

---

## 4. Stress / Load Testing Plan

### 4.1 k6 Script — Order Creation Spike

```javascript
import http from 'k6/http'
import { check, sleep } from 'k6'
import { SharedArray } from 'k6/data'

const users = new SharedArray('users', function () {
  return JSON.parse(open('./test-users.json'))
})

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up
    { duration: '1m',  target: 200 },  // Lunch rush spike
    { duration: '30s', target: 0 },    // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% under 2s
    http_req_failed: ['rate<0.01'],     // <1% errors
  },
}

export default function () {
  const user = users[Math.floor(Math.random() * users.length)]
  const payload = JSON.stringify({
    table_id: `tbl-${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}`,
    items: [
      { menu_item_id: `item-${String(Math.floor(Math.random() * 20) + 1).padStart(3, '0')}`, quantity: Math.ceil(Math.random() * 3) },
    ],
  })

  const res = http.post('https://staging.example.com/api/orders', payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user.token}`,
    },
  })

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response < 2s': (r) => r.timings.duration < 2000,
  })

  sleep(Math.random() * 3 + 1)
}
```

### 4.2 Performance Targets

| Metric | Target | Severity |
|--------|--------|----------|
| API p95 response time | < 2s | Warning |
| API p99 response time | < 5s | Critical |
| Error rate | < 1% | Critical |
| Concurrent users | 200 | Target |
| Order creation throughput | 50 req/s | Target |
| Menu browse throughput | 200 req/s | Target |
| RLS query overhead | < 50ms added | Warning |
| Webhook processing | < 3s per event | Critical |

### 4.3 Database Under RLS Load

Simulate 50 concurrent queries filtered by `restaurant_id`:

```
Query: SELECT * FROM orders WHERE restaurant_id = 'rest-a' LIMIT 20
Expected: < 100ms with 10,000 rows per tenant
Monitor: pg_stat_activity for long-running queries, index scans vs seq scans
```

Pre-load indexes to verify:
- `idx_orders_restaurant_status` on `orders(restaurant_id, status)`
- `idx_order_items_order` on `order_items(order_id)`

---

## 5. Security & RLS Testing

### 5.1 Cross-Tenant Isolation Test Cases

| Test | Actor | Action | Expected |
|------|-------|--------|----------|
| T1 | waiter-a@rest-a | GET /api/orders with restaurantId=rest-b | 403 or empty |
| T2 | admin-b@rest-b | POST /api/menu/items with restaurant_id=rest-a | Insert fails/isolation |
| T3 | waiter-a@rest-a | Query Supabase directly: `SELECT * FROM orders` | Only rest-a rows returned |
| T4 | Anon (no auth) | GET /api/orders | 401 |
| T5 | manager-a@rest-a | DELETE /api/menu/items/[id] (admin-only) | 403 |
| T6 | cashier-a@rest-a | POST /api/payroll (manager-only) | 403 |

### 5.2 RBAC Enforcement Matrix

```
                  admin  manager  cashier  waiter  chef   anon
Menu CRUD         ✓      ✗        ✗        ✗      ✗      ✗
Employee CRUD     ✓      ✗        ✗        ✗      ✗      ✗
View Reports      ✓      ✓        ✗        ✗      ✗      ✗
Process Payment   ✓      ✓        ✓        ✗      ✗      ✗
View Orders       ✓      ✓        ✓        ✓      ✓      ✗
Manage Payroll    ✓      ✓        ✗        ✗      ✗      ✗
KDS View          ✓      ✓        ✗        ✗      ✓      ✗
Manage Inventory  ✓      ✓        ✗        ✗      ✗      ✗
```

Test every cell with automated assertions.

### 5.3 Webhook Security Tests

| Test | Scenario | Expected |
|------|----------|----------|
| WH1 | Valid signature from Chapa | 200, transaction created |
| WH2 | Tampered body with valid-old-signature | 403, no DB change |
| WH3 | Replayed webhook (same tx_ref) | 409 or idempotent 200 |
| WH4 | Missing HMAC header | 401 |
| WH5 | Expired timestamp (>5min) | 403 |
| WH6 | Concurrent duplicate webhooks | Exactly one transaction record |

---

## 6. Offline / PWA Testing

### 6.1 Service Worker Test Scenarios (Playwright)

```typescript
// Playwright test outline
test('offline order creation queues and syncs', async ({ page }) => {
  // 1. Register service worker
  // 2. Go online, load menu page
  // 3. Go offline via CDP: context.setOffline(true)
  // 4. Create order — should store in IndexedDB / cache
  // 5. Go online: context.setOffline(false)
  // 6. Assert order appears in Supabase after sync
})

test('cache serves menu items offline', async ({ page }) => {
  // 1. Load menu while online
  // 2. Go offline
  // 3. Navigate to menu page
  // 4. Assert cached menu renders
})

test('conflict detection on stale data', async ({ page }) => {
  // 1. Load order list (v1)
  // 2. Another user updates order via API (v2)
  // 3. Offline user modifies v1 and syncs
  // 4. Assert conflict is flagged/rejected
})
```

### 6.2 Network Condition Matrix

| Condition | Download | Upload | Latency | Packet Loss |
|-----------|----------|--------|---------|-------------|
| 4G | 10 Mbps | 5 Mbps | 50ms | 0% |
| 3G | 1.5 Mbps | 0.5 Mbps | 200ms | 1% |
| Edge | 200 Kbps | 100 Kbps | 500ms | 3% |
| Offline | 0 | 0 | N/A | 100% |
| Intermittent | Flapping on/off every 10s | | | |

---

## 7. Execution Plan

### Phase 1: Seed Test Data

```
Step 1.1  Spin up staging environment (fresh Supabase project)
Step 1.2  Run all 139 existing tests to confirm baseline
Step 1.3  Insert organizations, branches, restaurants (see §2.1)
Step 1.4  Create users for all roles via Supabase Auth admin API
Step 1.5  Insert menu items, orders, payroll, subscriptions
Step 1.6  Insert stress-test dataset (10k+ orders, 50k audit logs)
Step 1.7  Verify tenant isolation with direct SQL assertions:
           SELECT COUNT(*) FROM orders WHERE restaurant_id = 'rest-a'
           → matches expected count for rest-a only
```

### Phase 2: Authentication Tests

```
Step 2.1  Login flow for every role (email/password)
Step 2.2  Login with invalid credentials → 401
Step 2.3  Session expiry → redirect to /login
Step 2.4  MFA challenge flow (if enabled)
Step 2.5  Token refresh cycle
```

### Phase 3: RBAC + RLS Isolation

```
Step 3.1  Run cross-tenant matrix (see §5.1 — 6 test cases)
Step 3.2  Run role-matrix (see §5.2 — 35 test cases)
Step 3.3  Verify RLS via Supabase local client:
           supabase.auth.setUser(waiter-a)
           const { data } = await supabase.from('orders').select('*')
           assert(data.every(o => o.restaurant_id === 'rest-a'))
Step 3.4  Verify orphan/deactivated users are blocked
```

### Phase 4: Functional Tests

```
Step 4.1  Customer journey: browse → cart → request waiter → request bill
Step 4.2  Admin journey: create menu item → edit → toggle availability → delete
Step 4.3  Waiter journey: view tables → acknowledge request → track order
Step 4.4  Cashier journey: view open orders → mark as paid
Step 4.5  Manager journey: view dashboard → run reports → review payroll
Step 4.6  Kitchen journey: accept order → update prep status → mark ready
Step 4.7  Webhook journey: POST valid Chapa webhook → verify transaction created
```

### Phase 5: Stress Tests

```
Step 5.1  Run k6 order-creation spike (50→200→0 users)
Step 5.2  Run k6 menu-browsing spike (100→500→0 users)
Step 5.3  Run k6 webhook concurrency (50 simultaneous webhooks)
Step 5.4  Analyze p95/p99 response times
Step 5.5  Analyze error rates against thresholds (§4.2)
Step 5.6  Check Supabase logs for RLS bottleneck queries
```

### Phase 6: Offline Tests

```
Step 6.1  Register service worker, prime cache
Step 6.2  Set offline via CDP
Step 6.3  Browse cached menu → assert renders
Step 6.4  Create order offline → assert queued
Step 6.5  Restore connectivity → assert order syncs
Step 6.6  Test conflict case (§6.1)
Step 6.7  Test all network conditions (§6.2)
```

### Phase 7: Final System Audit

```
Step 7.1  Run all 139 baseline tests → must still pass
Step 7.2  Run full Playwright E2E suite
Step 7.3  Run OWASP ZAP DAST scan
Step 7.4  Review Supabase RLS policy coverage (every table)
Step 7.5  Review API route middleware (every route guarded)
Step 7.6  Generate final report with pass/fail matrix
Step 7.7  Document any regressions or findings
```

---

## Appendix: Test Case Template

```typescript
// tests/manual/example.test.ts — illustrative, not executable
import { describe, it, expect } from 'vitest'

describe('RLS: Tenant Isolation', () => {
  it('waiter from rest-a cannot see rest-b orders', async () => {
    const supabase = createClient()
    await supabase.auth.signInWithPassword({ email: 'waiter-a1@test.com', password: 'test123' })

    const { data } = await supabase.from('orders').select('restaurant_id')

    const uniqueTenants = [...new Set(data?.map(o => o.restaurant_id) ?? [])]
    expect(uniqueTenants).toHaveLength(1)
    expect(uniqueTenants[0]).toBe('rest-a')
  })
})
```

---

## Appendix: Tools & Versions

| Tool | Version | Purpose |
|------|---------|---------|
| Playwright | 1.61+ | E2E browser tests |
| Vitest | 4.1+ | Unit + integration tests |
| k6 | latest | Load / stress testing |
| OWASP ZAP | latest | DAST security scanning |
| Supabase CLI | latest | Local dev + SQL assertions |
| Chrome DevTools Protocol | Built-in | Network throttling |
| Lighthouse | Built-in | PWA audit |
