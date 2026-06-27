# RBAC Final Audit

> Generated: 2026-06-27 (updated after admin↔inventory_manager hierarchy swap, sidebar refactor, +20 RBAC tests)
> Audit scope: All 102 API route files, sidebar navigation, dashboard routing, and test coverage.

---

## 1. Role Hierarchy

```typescript
kitchen_staff:     1  (lowest)
waiter:            2
cashier:           3
manager:           4
admin:             5
inventory_manager: 6
owner:             7
system_admin:      8  (highest)
```

**Source:** `src/lib/utils/permissions.ts:3-12`

> **Change:** admin and inventory_manager were swapped from the original hierarchy (admin was 6, inventory_manager was 5). This gives inventory_manager access to admin-level routes (employees CRUD, tables, payments, payroll) as required by the new org chart: Owner → Inventory_Manager → Manager → Admin → cashier/waiter/kitchen_staff.

---

## 2. Core Authorization Functions

### `requireTenant()` — `src/lib/utils/tenant.ts:21-65`
- Extracts tenant from `x-tenant-*` headers or falls back to Supabase session.
- Returns `TenantContext` (restaurantId, organizationId, role, userId) or 401/403 `NextResponse`.

### `requireRole(tenant, minRole)` — `tenant.ts:67-84`
- **System admin isolation:** If `tenant.role === 'system_admin'` and `minRole` is neither `'system_admin'` nor `'admin'`, returns **403**.
- Otherwise checks `ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole]`.

### `requireMutate(tenant)` — `tenant.ts:86-95`
- Returns **403** `READ_ONLY` if `tenant.role === 'owner'`.
- All other roles pass through (null).

### Convenience wrappers (`tenant.ts:97-127`)
| Function | Calls |
|---|---|
| `requireAdminTenant()` | `requireTenant()` + `requireRole(_, 'admin')` |
| `requireOwnerTenant()` | `requireTenant()` + `requireRole(_, 'owner')` |
| `requireInventoryManagerTenant()` | `requireTenant()` + `requireRole(_, 'inventory_manager')` |
| `requireSystemAdminTenant()` | `requireTenant()` + `requireRole(_, 'system_admin')` |

### `auth-guard.ts` (parallel implementation)
Same logic using `AuthResult` instead of `TenantContext`. Mirrors all functions.

---

## 3. Permission Matrix

### Legend
| Symbol | Meaning |
|---|---|
| ✅ | Allowed (read + write) |
| 📖 | Read-only (requireMutate blocks writes) |
| 🚫 | Blocked (403 Forbidden) |
| 🔒 | Requires authentication (401 if unauthenticated) |
| &mdash; | Not applicable / no route exists |

### API Endpoint — Role Matrix

| Endpoint | Auth | kitchen_staff | waiter | cashier | manager | inv_manager | admin | owner | sys_admin | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| **Admin** | | | | | | | | | | |
| `GET /api/admin/audit-logs` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | reqRole(admin) |
| **AI** | | | | | | | | | | |
| `POST /api/ai/query` | 🔒 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 📖 | 🚫 | reqRole(manager), read-only SELECT only |
| **Analytics** | | | | | | | | | | |
| `GET /api/analytics/export` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| `GET /api/analytics/revenue` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| **Attendance** | | | | | | | | | | |
| `GET /api/attendance/[id]` | 🔒 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 | 🚫 | reqRole(kitchen_staff) |
| `POST /api/attendance/clock` | 🔒 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 | 🚫 | reqRole(kitchen_staff) |
| `GET /api/attendance/current` | 🔒 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 | 🚫 | reqRole(kitchen_staff) |
| `GET /api/attendance/history` | 🔒 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 📖 | 🚫 | reqRole(manager) |
| `GET /api/attendance/stats` | 🔒 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 📖 | 🚫 | reqRole(manager) |
| **Auth** | | | | | | | | | | |
| `POST /api/auth` | 🔓 | — | — | — | — | — | — | — | — | Public login |
| `POST /api/auth/logout` | 🔒 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Any authenticated |
| `POST /api/auth/register` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 🚫 | reqRole(admin) |
| **Backups** | | | | | | | | | | |
| `GET /api/backups` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | reqRole(admin) |
| `POST /api/backups` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| `GET /api/backups/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | reqRole(admin) |
| `DELETE /api/backups/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| **Branches** | | | | | | | | | | |
| `GET /api/branches` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 🚫 | reqRole(admin) |
| `POST /api/branches` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| `PUT /api/branches` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| `DELETE /api/branches` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| **Campaigns** | | | | | | | | | | |
| `GET /api/campaigns` | 🔒 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(cashier) |
| `POST /api/campaigns` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| `GET /api/campaigns/[id]` | 🔒 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(cashier) |
| `PUT /api/campaigns/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| `DELETE /api/campaigns/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| **Coupons** | | | | | | | | | | |
| `GET /api/coupons` | 🔒 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(waiter) |
| `POST /api/coupons` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| `GET /api/coupons/[id]` | 🔒 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(waiter) |
| `PUT /api/coupons/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| `DELETE /api/coupons/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| `POST /api/coupons/validate` | 🔒 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 | 🚫 | reqRole(waiter) |
| **Customers** | | | | | | | | | | |
| `GET /api/customers` | 🔒 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(waiter) |
| `POST /api/customers` | 🔒 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 | 🚫 | reqRole(waiter) |
| `GET /api/customers/[id]` | 🔒 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(waiter) |
| `PUT /api/customers/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| `GET /api/customers/[id]/points` | 🔒 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(waiter) |
| `POST /api/customers/[id]/points` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| `GET /api/customers/[id]/visits` | 🔒 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(waiter) |
| **Employees** | | | | | | | | | | |
| `GET /api/employees` | 🔒 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(manager) |
| `POST /api/employees` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| `PUT /api/employees` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| `DELETE /api/employees` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| **EOD** | | | | | | | | | | |
| `GET /api/eod/[id]` | 🔒 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(cashier) |
| `POST /api/eod/approve` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(inv_manager) |
| `POST /api/eod/close` | 🔒 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 📖 | 🚫 | reqRole(manager) |
| `GET /api/eod/current` | 🔒 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(cashier) |
| `GET /api/eod/history` | 🔒 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(cashier) |
| `POST /api/eod/open` | 🔒 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | 📖 | 🚫 | reqRole(cashier) |
| `POST /api/eod/reopen` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(inv_manager) |
| `GET /api/eod/report` | 🔒 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(cashier) |
| **Fayda (National ID)** | | | | | | | | | | |
| `GET /api/fayda` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 🚫 | reqRole(admin) |
| `POST /api/fayda` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| `GET /api/fayda/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 🚫 | reqRole(admin) |
| `PUT /api/fayda/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| `DELETE /api/fayda/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| `GET /api/fayda/employee/[eId]` | 🔒 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(manager) |
| `POST /api/fayda/verify` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| **Forecasts** | | | | | | | | | | |
| `GET /api/forecasts` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 🚫 | reqRole(inv_manager) |
| `POST /api/forecasts` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(inv_manager) |
| `GET /api/forecasts/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 🚫 | reqRole(inv_manager) |
| `PUT /api/forecasts/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(inv_manager) |
| `DELETE /api/forecasts/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(inv_manager) |
| `GET /api/forecasts/current` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 🚫 | reqRole(inv_manager) |
| `GET /api/forecasts/ingredient/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 🚫 | reqRole(inv_manager) |
| `GET /api/forecasts/low-stock` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 🚫 | reqRole(inv_manager) |
| `GET /api/forecasts/reorder-suggestions` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 🚫 | reqRole(inv_manager) |
| `PUT /api/forecasts/reorder-suggestions/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(inv_manager) |
| **Health** | | | | | | | | | | |
| `GET /api/health` | 🔓 | — | — | — | — | — | — | — | — | Public |
| **Inventory** | | | | | | | | | | |
| `POST /api/inventory/cross-branch` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(inv_manager) |
| `GET /api/inventory/forecasts` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 🚫 | reqRole(inv_manager) |
| `GET /api/inventory/forecasts/current` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 🚫 | reqRole(inv_manager) |
| `POST /api/inventory/forecasts/generate` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(inv_manager) |
| `GET /api/inventory/forecasts/ingredient/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 🚫 | reqRole(inv_manager) |
| `GET /api/inventory/forecasts/low-stock` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 🚫 | reqRole(inv_manager) |
| `GET /api/inventory/forecasts/reorder-suggestions` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 🚫 | reqRole(inv_manager) |
| **Manager Reports** | | | | | | | | | | |
| `GET /api/manager/reports` | 🔒 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(manager) |
| **Menu** | | | | | | | | | | |
| `GET /api/menu/items` | 🔒 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(kitchen_staff) |
| `POST /api/menu/items` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| `GET /api/menu/items/[id]` | 🔒 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(kitchen_staff) |
| `PUT /api/menu/items/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| `DELETE /api/menu/items/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| **Onboarding** | | | | | | | | | | |
| `POST /api/onboarding/complete` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | 🚫 | reqRole(owner) (intentionally no requireMutate) |
| `POST /api/onboarding/menu` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | 🚫 | reqRole(owner) (intentionally no requireMutate) |
| `POST /api/onboarding/restaurant` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | 🚫 | reqRole(owner) (intentionally no requireMutate) |
| `GET /api/onboarding/status` | 🔒 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Any authenticated |
| `POST /api/onboarding/tables` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | 🚫 | reqRole(owner) (intentionally no requireMutate) |
| **Orders** | | | | | | | | | | |
| `GET /api/orders` | 🔒 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(kitchen_staff) |
| `POST /api/orders` | 🔒 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 | 🚫 | reqRole(waiter) |
| `GET /api/orders/[id]` | 🔒 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(kitchen_staff) |
| `PUT /api/orders/[id]` | 🔒 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 | 🚫 | reqRole(waiter) |
| `DELETE /api/orders/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| **Organization** | | | | | | | | | | |
| `GET /api/organization/analytics` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | 🚫 | reqRole(owner), owner-only |
| `GET /api/organization/branches` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | 🚫 | reqRole(owner), owner-only |
| `GET /api/organization/reports` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | 🚫 | reqRole(owner), owner-only |
| `GET /api/organization/revenue` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | 🚫 | reqRole(owner), owner-only |
| **Owner** | | | | | | | | | | |
| `GET /api/owner/analytics` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | 🚫 | reqRole(owner) |
| **Payments** | | | | | | | | | | |
| `POST /api/payments/chapa` | 🔒 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 | 🚫 | reqRole(waiter) |
| `POST /api/payments/verify` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| `GET /api/payments/verify/[id]` | 🔒 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(cashier) |
| **Payroll** | | | | | | | | | | |
| `GET /api/payroll` | 🔒 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(manager) |
| `POST /api/payroll` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| `PUT /api/payroll` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| `DELETE /api/payroll` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| **Plans** | | | | | | | | | | |
| `GET /api/plans` | 🔓 | — | — | — | — | — | — | — | — | Public |
| **Receipts** | | | | | | | | | | |
| `GET /api/receipts` | 🔒 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(cashier) |
| `POST /api/receipts` | 🔒 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | 📖 | 🚫 | reqRole(cashier) |
| `GET /api/receipts/[id]` | 🔒 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(cashier) |
| `POST /api/receipts/[id]/send` | 🔒 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | 📖 | 🚫 | reqRole(cashier) |
| `POST /api/receipts/generate` | 🔒 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | 📖 | 🚫 | reqRole(cashier) |
| `GET /api/receipts/order/[orderId]` | 🔒 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(cashier) |
| **Reservations** | | | | | | | | | | |
| `GET /api/reservations` | 🔒 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(waiter) |
| `POST /api/reservations` | 🔒 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 | 🚫 | reqRole(waiter) |
| `GET /api/reservations/[id]` | 🔒 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(waiter) |
| `PUT /api/reservations/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 📖 | 🚫 | reqRole(manager) |
| `DELETE /api/reservations/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| `GET /api/reservations/availability` | 🔒 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(waiter) |
| `GET /api/reservations/waitlist` | 🔒 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(waiter) |
| `POST /api/reservations/waitlist` | 🔒 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 | 🚫 | reqRole(waiter) |
| `DELETE /api/reservations/waitlist/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| **Restaurant Settings** | | | | | | | | | | |
| `GET /api/restaurant/settings` | 🔒 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(kitchen_staff) |
| `PUT /api/restaurant/settings` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| **Service Requests** | | | | | | | | | | |
| `GET /api/service-requests` | 🔒 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(cashier) |
| `POST /api/service-requests` | 🔒 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 | 🚫 | reqRole(waiter) |
| **Shifts** | | | | | | | | | | |
| `GET /api/shifts` | 🔒 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(manager) |
| `POST /api/shifts` | 🔒 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 📖 | 🚫 | reqRole(manager) |
| `GET /api/shifts/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(manager) |
| `PUT /api/shifts/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| `DELETE /api/shifts/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| `POST /api/shifts/assign` | 🔒 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 📖 | 🚫 | reqRole(manager) |
| `GET /api/shifts/calendar` | 🔒 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(manager) |
| `POST /api/shifts/publish` | 🔒 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 📖 | 🚫 | reqRole(manager) |
| `POST /api/shifts/swap` | 🔒 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 📖 | 🚫 | reqRole(manager) |
| **Subscriptions** | | | | | | | | | | |
| `GET /api/subscriptions` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | reqRole(admin) |
| `POST /api/subscriptions` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| **Supabase Proxy** | | | | | | | | | | |
| `ALL /api/supabase/[...path]` | 🔒 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Only requireTenant(); delegates to RLS |
| **Tables** | | | | | | | | | | |
| `POST /api/tables/[id]/assign` | 🔒 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 📖 | 🚫 | reqRole(manager) |
| **Tips** | | | | | | | | | | |
| `GET /api/tips` | 🔒 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(cashier) |
| `POST /api/tips` | 🔒 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 | 🚫 | reqRole(waiter) |
| `GET /api/tips/[id]` | 🔒 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(cashier) |
| `PUT /api/tips/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| `DELETE /api/tips/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| `GET /api/tips/distributions` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 🚫 | reqRole(inv_manager) |
| `GET /api/tips/payouts` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 🚫 | reqRole(inv_manager) |
| `GET /api/tips/pools` | 🔒 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(manager) |
| `POST /api/tips/pools` | 🔒 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 📖 | 🚫 | reqRole(manager) |
| `GET /api/tips/pools/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | 🚫 | reqRole(manager) |
| `PUT /api/tips/pools/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| `DELETE /api/tips/pools/[id]` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | 📖 | 🚫 | reqRole(admin) |
| `GET /api/tips/summary` | 🔒 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 🚫 | reqRole(inv_manager) |
| **Webhooks** | | | | | | | | | | |
| `POST /api/webhooks/chapa` | 🔓 | — | — | — | — | — | — | — | — | Public (webhook) |
| `POST /api/webhooks/tallyet` | 🔓 | — | — | — | — | — | — | — | — | Public (webhook) |

---

## 4. Dashboard Routing

**File:** `src/app/(staff)/dashboard/page.tsx:15-24`

| Role | Redirects to |
|---|---|
| `system_admin` | `/dashboard/system-admin` |
| `owner` | `/dashboard/owner` |
| `admin` | `/dashboard/admin` |
| `inventory_manager` | `/dashboard/head-manager` |
| `manager` | `/dashboard/manager` |
| `cashier` | `/dashboard/cashier` |
| `waiter` | `/dashboard/waiter` |
| `kitchen_staff` | `/dashboard/kitchen` |
| *(unknown)* | `/dashboard/waiter` (fallback) |

---

## 5. Sidebar Navigation per Role

**File:** `src/components/layout/sidebar.tsx`

| Role | Nav Items | Links |
|---|---|---|---|
| **system_admin** | 6 | Dashboard, Restaurants, Pricing, System Reports, Audit Logs, Settings |
| **owner** | 11 | Dashboard, Revenue, Reports, Expenses, Payroll, Inventory, Downloads, Employees, Tables, Orders, Branches |
| **inventory_manager** | 13 | Dashboard, Inventory, Ingredients, Suppliers, Purchases, Expenses, Payments, Payroll, EOD, Reports, Employees, Tables, Push Reports |
| **manager** | 6 | Dashboard, Employees, Tables, Attendance, Shifts, Reservations |
| **admin** | 28 | Dashboard, Menu, Categories, Employees, Tables, Table Assign, Payments, Payroll, Reports, Org Reports, KDS, Inventory, Cross-Branch, Branches, Subscriptions, Audit Logs, Attendance, Shifts, EOD, Tips, Receipts, Forecasts, Reservations, Customers, Loyalty, Backups, Fayda, Payment Verification |
| **cashier** | 4 | Dashboard, Receipts, EOD, Reservations |
| **waiter** | 3 | Dashboard, Tips, Reservations |
| **kitchen_staff** | 1 | Dashboard |

> **Sidebar changes:**
> - `systemAdminNav`: Removed Subscriptions (duplicate of Pricing) and Backups.
> - `ownerNav`: Added Employees, Tables, Orders, Branches.
> - `headManagerNav` (inventory_manager): Added Employees, Tables, Push Reports.

---

## 6. Isolation Boundaries

### 6.1 Owner Read-Only Enforcement
- **`requireMutate()`** blocks POST, PUT, PATCH, DELETE for owner role.
- Applied to all mutation endpoints (25+ files audited and patched).
- Exceptions (intentional):
  - Onboarding routes (`onboarding/complete`, `onboarding/menu`, `onboarding/restaurant`, `onboarding/tables`) — called during setup, owner needs to write.
  - `ai/query` — read-only SELECT queries only.
  - Supabase proxy — delegates to RLS.

### 6.2 System Admin Isolation
- **`requireRole()`** blocks system_admin unless `minRole` is `'admin'` or `'system_admin'`.
- System admin **cannot** access:
  - Orders, menu items, employees, tables, inventory, payroll, expenses, customers, reservations, tips, receipts, EOD, attendance, shifts, forecasts, campaigns, coupons, service requests, fayda.
- System admin **can** access:
  - Audit logs, backups, subscriptions, branches (system-level), organization reports (read-only system view), settings.

### 6.3 Cross-Tenant Isolation
- All routes use `restaurant_id` filtering from `TenantContext`;
- Organization-level routes (`organization/*`, `owner/*`) filter by `organizationId`.

---

## 7. Security Findings & Migration Notes

### Resolved
| Issue | File(s) | Fix |
|---|---|---|
| Missing `requireMutate()` on POST endpoints | branches, campaigns, coupons, customers, employees, fayda, menu/items, orders, payments/chapa, reservations, restaurant/settings, service-requests, subscriptions | Added `requireMutate()` after `requireRole()` |
| Missing `requireMutate()` on PUT/DELETE | menu/items/[id], branches, campaigns, coupons, customers, employees, fayda, forecast, orders/[id], reservations/[id], shifts, tips, backups | Added `requireMutate()` |
| `orders/route.ts` POST missing role check | orders/route.ts | Added `requireMutate()` |
| `service-requests/route.ts` POST missing role check | service-requests/route.ts | Added `requireMutate()` |
| `employees/route.ts` POST/PUT/DELETE missing `requireMutate()` | employees/route.ts | Added `requireMutate()` |
| System admin bypass on business routes | tenant.ts, auth-guard.ts | Added system_admin isolation in `requireRole()` |
| Test expectations updated | organization-rbac.test.ts | 3 tests updated (system_admin → expect 403) |

### Remaining Gaps (Low Priority)
| Gap | Location | Risk |
|---|---|---|
| Supabase proxy (`supabase/[...path]/route.ts`) only calls `requireTenant()` — no role check | `src/app/api/supabase/[...path]/route.ts` | Low — RLS enforces at DB level |
| Onboarding routes have no `requireMutate()` | `onboarding/*` | Low — owner-only endpoints by `requireRole(owner)` |
| `ai/query` has no `requireMutate()` | `ai/query/route.ts` | None — only executes read-only SELECT |

---

## 8. Test Coverage

| Test File | Lines | Coverage |
|---|---|---|---|
| `tests/unit/permissions.test.ts` | 219 | ROLE_HIERARCHY, hasPermission, all helper functions, enforceReadOnly, canViewSystemData, canViewBusinessData |
| `tests/unit/auth-guard.test.ts` | 403 | requireAuth (auth/unauth/no profile/expired), requireRole (hierarchy), requireAdmin, requireMutate, requireOwner, requireInventoryManager, requireSystemAdmin, requireAdminOrOwner |
| `tests/security/rbac.test.ts` | 1544 | Unauthenticated access, role escalation prevention, admin-only endpoints, Attendance RBAC, Shift RBAC, EOD RBAC, Owner read-only enforcement (inventory, payroll, employees, branches, orders, EOD open, shifts, clock, reservations, campaigns), Receipts RBAC, Tips RBAC, Reservations RBAC, CRM/Loyalty RBAC, Multi-tenant isolation, Role-scoped access control, System admin isolation additional (branches, shifts, customers, attendance current), Inventory manager additional flows (employees, branches, EOD current, payroll, close EOD, inventory forecasts) |
| `tests/security/organization-rbac.test.ts` | 173 | Organization analytics/revenue/branches: owner allowed, system_admin blocked (business data isolation), admin/manager/waiter/cashier blocked, unauthenticated 401 |
| `tests/integration/backups.test.ts` | 557 | Backup lifecycle with mocked requireTenant/requireRole/requireMutate |

**Total: 304 tests across 16 files (all passing).**

### Changes from previous audit:
- Added **20 new RBAC tests** in `tests/security/rbac.test.ts`:
  - Owner read-only GET access (employees, branches, orders) — 3 tests
  - Owner read-only mutation additional (EOD open, shifts POST, clock, reservations, campaigns, employees PUT) — 6 tests
  - System admin isolation additional (branches, shifts, customers, attendance current) — 4 tests
  - Inventory manager additional flows (employees, branches, EOD current, payroll, close EOD, inventory forecasts) — 6 tests
  - Fixed 1 test for inventory_manager payroll POST (expect 201 now) — 1 test
- Fixed **5 existing tests** affected by hierarchy swap:
  - Admin → EOD approve (expect 403)
  - Inventory_manager → payroll POST (expect 201)
  - EOD current (added RPC mock)
  - EOD close (added closing record mock)
  - Inventory forecasts (added RPC mock)
- Fixed **backups RBAC test**: inventory_manager moved from 403 list to allowed list.
- Fixed **duplicated hierarchy bug** in `use-auth.tsx` (was inv_mgr=4, mgr=5 → now mgr=4, admin=5, inv_mgr=6).

### Running Tests
```bash
# Full RBAC and permissions test suite
npx vitest run tests/unit/permissions.test.ts tests/unit/auth-guard.test.ts tests/security/rbac.test.ts tests/security/organization-rbac.test.ts tests/integration/backups.test.ts

# All tests
npx vitest run
```

---

## 9. Auth Guard Pattern Reference

Every API route file should follow this pattern:

```typescript
// GET (read)
export async function GET() {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant
  const roleError = requireRole(tenant, 'required_role')
  if (roleError) return roleError
  // ... handler ...
}

// POST/PUT/DELETE (mutation)
export async function POST(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant
  const roleError = requireRole(tenant, 'required_role')
  if (roleError) return roleError
  const mutateError = requireMutate(tenant)
  if (mutateError) return mutateError
  // ... handler ...
}
```

Or use convenience wrappers for common combinations:
```typescript
export async function GET() {
  const tenant = await requireAdminTenant()
  if (tenant instanceof NextResponse) return tenant
  // ... handler (already checked admin role) ...
}
```
