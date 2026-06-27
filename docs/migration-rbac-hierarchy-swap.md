# Migration Plan: Admin ↔ Inventory Manager Hierarchy Swap

## Summary

Swapped the role hierarchy levels of `admin` (was 6 → now 5) and `inventory_manager` (was 5 → now 6) to align with the organizational chart: Owner → Inventory_Manager → Manager → Admin. Also refactored sidebar navigation and added 20 new RBAC tests.

---

## 1. Changes Made

### 1.1 Core Hierarchy (`src/lib/utils/permissions.ts`)
| Role | Before | After |
|---|---|---|
| admin | 6 | 5 |
| inventory_manager | 5 | 6 |

### 1.2 Bug Fixes
| File | Bug | Fix |
|---|---|---|
| `src/hooks/use-auth.tsx` | Duplicated hierarchy: inv_mgr=4, mgr=5 (inverted from canonical) | Restored: mgr=4, admin=5, inv_mgr=6 |
| `tests/integration/backups.test.ts` | Mock hierarchy was inv_mgr=4, mgr=5 | Fixed to match canonical |

### 1.3 Test Updates
| Test | Change |
|---|---|
| `tests/unit/permissions.test.ts` | Hierarchy order: `manager < admin < inventory_manager`; `hasPermission('inventory_manager', 'admin')` → true |
| `tests/security/rbac.test.ts` | EOD approve: admin → 403; payroll POST: inv_mgr → 201; +20 new tests (owner read-only GET, system admin isolation, inventory manager flows) |
| `tests/integration/backups.test.ts` | Inv_mgr moved from 403 list to allowed list for backups |

### 1.4 Sidebar Navigation (`src/components/layout/sidebar.tsx`)
| Nav | Changes |
|---|---|
| `systemAdminNav` | Removed Subscriptions (duplicate of Pricing), Removed Backups |
| `ownerNav` | Added Employees, Tables, Orders, Branches |
| `headManagerNav` (inv_mgr) | Added Employees, Tables, Push Reports |

### 1.5 i18n
| File | Addition |
|---|---|
| `src/lib/i18n/en.ts` | `sidebar.orders`, `sidebar.pushReports` |

---

## 2. Impact Analysis

### Routes affected (inventory_manager gained access to 30+ reqRole('admin') endpoints):
- Backups CRUD
- Branches CRUD
- Subscriptions
- Fayda CRUD
- Payroll POST/PUT/DELETE
- Menu items POST/PUT/DELETE
- Orders DELETE
- Employees POST/PUT/DELETE
- Campaigns POST/PUT/DELETE
- Coupons POST/PUT/DELETE
- Tips PUT/DELETE
- Tips pools PUT/DELETE
- Shifts PUT/DELETE
- Reservations DELETE
- Reservations waitlist DELETE
- Customers PUT, POST points
- Payments verify
- Restaurant settings PUT
- Auth register
- Analytics export/revenue
- Fayda verify

All are intentional — inventory_manager now sits above admin and should have full admin-level access.

### Routes NOT affected:
- Organization routes (`reqRole('owner')`) — inv_mgr(6) < owner(7), still blocked
- Owner analytics (`reqRole('owner')`) — still blocked
- Supabase proxy — delegates to RLS
- Onboarding routes (`reqRole('owner')`) — still blocked

### Owner side:
- All `requireMutate()` calls remain in place — owner remains read-only
- Owner GET access verified for employees, tables, orders, branches (all use reqRole('manager') or lower)

---

## 3. Rollback Plan

```bash
# 1. Revert hierarchy in permissions.ts
#    admin: 6, inventory_manager: 5

# 2. Revert use-auth.tsx hierarchy

# 3. Revert sidebar.tsx
#    - Restore Subscriptions and Backups to systemAdminNav
#    - Remove Employees, Tables, Orders, Branches from ownerNav
#    - Remove Employees, Tables, Push Reports from headManagerNav

# 4. Remove sidebar.orders and sidebar.pushReports i18n keys from en.ts

# 5. Revert test changes
#    - Revert hierarchy expectations in permissions.test.ts
#    - In rbac.test.ts: admin→EOD approve back to 200, inv_mgr→payroll POST back to 403
#    - Remove 20 new tests
#    - Move inv_mgr back to 403 list in backups.test.ts

# 6. Run full test suite
npx vitest run
```

---

## 4. Verification

- **Test suite passes:** 304 tests, 16 files, 0 failures
- **TypeScript:** `npx tsc --noEmit` passes
- **i18n keys present:** `sidebar.orders`, `sidebar.pushReports`
- **All `requireMutate()` calls present on mutation endpoints**
- **Owner GET access verified for employees, tables, orders, branches**
- **System admin isolation verified for business data routes**
