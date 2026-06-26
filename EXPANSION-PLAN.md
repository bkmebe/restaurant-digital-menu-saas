# RestaurantOS Enterprise Expansion Plan

> **Prepared:** June 23, 2026
> **Target:** Transform RestaurantOS from a single-store digital menu platform into a full multi-tenant Restaurant ERP
> **Architect:** Senior Software Architect review

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Design & Database Schema](#2-architecture-design--database-schema)
3. [Security Review: RLS, Permissions & API Authorization](#3-security-review)
4. [Implementation Plan: Phases, Priorities & Migration](#4-implementation-plan)
5. [UI/UX Plan: New Dashboards, Pages & Navigation](#5-uiux-plan)
6. [Testing Plan](#6-testing-plan)
7. [Production Readiness Review](#7-production-readiness-review)
8. [Risk Assessment](#8-risk-assessment)
9. [Recommended Implementation Order](#9-recommended-implementation-order)
10. [Estimated Development Timeline](#10-estimated-development-timeline)
11. [Final Go/No-Go Recommendation](#11-final-go-no-go-recommendation)

---

## 1. Executive Summary

RestaurantOS currently serves as a single-restaurant digital menu, ordering, and basic management platform. This expansion plan extends it into a complete Restaurant ERP with 14 major feature additions while preserving all existing functionality.

### Key Numbers
- **~62 existing pages**, **0 build errors** (current state)
- **14 new feature areas** to implement
- **~25 new database tables** to create
- **~8 new user roles** (expanded from current 4 profile roles)
- **~40+ new API routes**
- **~30+ new pages/dashboards**

### Guiding Principles
1. **Zero breakage** — existing routes, APIs, RLS, auth flows remain unchanged
2. **Pattern consistency** — new code mirrors existing patterns (hooks, API guards, Supabase client usage)
3. **Backward compatibility** — existing roles (`admin`, `manager`, `cashier`, `waiter`) continue working identically
4. **Incremental delivery** — features are ordered by dependency and risk

---

## 2. Architecture Design & Database Schema

### 2.1 New User Roles & Profile Extension

**Current profile role enum:** `admin | manager | cashier | waiter`
**Current Employee role enum:** `waiter | cashier | manager`

**Target role set (8 roles):**
```
system_admin
owner
admin (existing)
inventory_manager (existing in common.ts, not in DB)
manager (existing)
cashier (existing)
waiter (existing)
kitchen_staff (existing in common.ts, not in DB)
```

#### Changes Required

**a) Extend `profiles.role` enum in Supabase:**
```sql
ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'system_admin';
ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'inventory_manager';
ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'kitchen_staff';
```

**b) Extend `employees.role` enum:**
```sql
ALTER TYPE employee_role_type ADD VALUE IF NOT EXISTS 'inventory_manager';
ALTER TYPE employee_role_type ADD VALUE IF NOT EXISTS 'kitchen_staff';
ALTER TYPE employee_role_type ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE employee_role_type ADD VALUE IF NOT EXISTS 'admin';
```

**c) Update TypeScript types in `src/types/database.ts`:**
- `Profile.role`: widen to include all 8 roles
- `Employee.role`: widen to include all 8 roles

**d) Update `src/types/common.ts`:**
- Add `'system_admin' | 'owner'` to the `Role` union type

**e) Update `src/lib/utils/permissions.ts`:**
```typescript
export const ROLE_HIERARCHY: Record<Role, number> = {
  kitchen_staff: 1,
  waiter: 2,
  cashier: 3,
  inventory_manager: 4,
  manager: 5,
  admin: 6,
  owner: 7,
  system_admin: 8,
}
```

**f) Update `src/hooks/use-auth.tsx` hierarchy:**
```typescript
const hierarchy: Record<string, number> = {
  kitchen_staff: 1, waiter: 2, cashier: 3, inventory_manager: 4,
  manager: 5, admin: 6, owner: 7, system_admin: 8,
}
```

### 2.2 Permission Matrix

| Feature | system_admin | owner | admin | inv. mgr | manager | cashier | waiter | kitchen |
|---|---|---|---|---|---|---|---|---|
| System settings | CRUD | - | - | - | - | - | - | - |
| Multi-branch admin | CRUD | R | CRUD | - | - | - | - | - |
| Restaurant settings | CRUD | R | CRUD | - | - | - | - | - |
| Employees | CRUD | R | CRUD | - | - | - | - | - |
| Menu management | CRUD | R | CRUD | - | - | - | - | - |
| Inventory | CRUD | R | CRUD | CRUD | R | - | - | - |
| Purchases/Suppliers | CRUD | R | CRUD | CRUD | R | - | - | - |
| End-of-Day Closing | - | R | - | Approve | - | Verify | Submit | - |
| Waiter tips | CRUD | R | R | - | R | - | View own | - |
| Attendance | CRUD | R | R | - | CRUD | - | - | - |
| Payroll | CRUD | R | CRUD | - | CRUD | - | - | - |
| Reports | CRUD | R | CRUD | R | CRUD | R | R | - |
| Shift management | CRUD | R | CRUD | - | CRUD | CRUD | Use | - |
| Tables | CRUD | R | CRUD | - | R | R | R | - |
| Orders | - | R | R | - | R | R | R | R |
| KDS | - | - | R | - | R | - | - | CRUD |
| Audit logs | CRUD | R | R | - | - | - | - | - |
| Payment config | CRUD | R | CRUD | - | - | - | - | - |
| Subscription | CRUD | R | R | - | - | - | - | - |
| Receipts | - | - | - | - | R | R | R | - |
| Backups | CRUD | R | - | - | - | - | - | - |

**Key:** `C`=Create, `R`=Read-only, `U`=Update, `D`=Delete. `-` = No access.

### 2.3 New Database Tables

Below are all new tables required, organized by feature. All tables include `created_at` and `updated_at` timestamps.

#### Feature: Organization / Multi-Branch Architecture

**Note:** The `organizations` table already exists in the database (referenced in `profiles.organization_id`, `branches.organization_id`). We need to extend its usage.

```sql
-- Extend existing organizations (if not already present)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_plan_id UUID REFERENCES plans(id);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_branches INTEGER DEFAULT 1;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_employees INTEGER DEFAULT 10;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
```

#### Feature: Attendance System

```sql
CREATE TABLE staff_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  date DATE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  total_break_minutes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'present',  -- present | absent | late | half_day | overtime
  late_minutes INTEGER DEFAULT 0,
  overtime_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, date)
);

CREATE TABLE attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  action TEXT NOT NULL,  -- clock_in | clock_out | break_start | break_end
  timestamp TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  device_info TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Feature: End of Day Closing

```sql
CREATE TABLE cash_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  date DATE NOT NULL,
  waiter_id UUID REFERENCES employees(id),
  cashier_id UUID REFERENCES employees(id),
  
  -- Waiter submits
  waiter_cash_sales DECIMAL(12,2) DEFAULT 0,
  waiter_mobile_sales DECIMAL(12,2) DEFAULT 0,
  waiter_tips DECIMAL(12,2) DEFAULT 0,
  waiter_submitted_at TIMESTAMPTZ,
  waiter_notes TEXT,
  
  -- Cashier verifies
  cashier_cash_total DECIMAL(12,2) DEFAULT 0,
  cashier_mobile_total DECIMAL(12,2) DEFAULT 0,
  cashier_discrepancy DECIMAL(12,2) DEFAULT 0,
  cashier_verified_at TIMESTAMPTZ,
  cashier_notes TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'pending',  -- pending | waiter_submitted | cashier_verified | manager_approved | approved
  inventory_manager_id UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  final_sales_total DECIMAL(12,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(restaurant_id, date)
);

CREATE TABLE daily_sales_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  date DATE NOT NULL,
  reconciliation_id UUID REFERENCES cash_reconciliation(id),
  
  total_orders INTEGER DEFAULT 0,
  total_sales DECIMAL(12,2) DEFAULT 0,
  total_tips DECIMAL(12,2) DEFAULT 0,
  total_tax DECIMAL(12,2) DEFAULT 0,
  cash_sales DECIMAL(12,2) DEFAULT 0,
  mobile_sales DECIMAL(12,2) DEFAULT 0,
  
  order_count_by_hour JSONB DEFAULT '{}',
  peak_hour TEXT,
  average_order_value DECIMAL(12,2) DEFAULT 0,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(restaurant_id, date)
);
```

#### Feature: Waiter Tips

```sql
CREATE TABLE staff_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  order_id UUID REFERENCES orders(id),
  
  tip_type TEXT NOT NULL,  -- cash | mobile | manual
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'ETB',
  
  -- For mobile tips
  payment_reference TEXT,
  
  status TEXT DEFAULT 'pending',  -- pending | confirmed | paid_out
  confirmed_by UUID REFERENCES employees(id),
  confirmed_at TIMESTAMPTZ,
  paid_out_at TIMESTAMPTZ,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Feature: Mobile Payment Verification

```sql
CREATE TABLE payment_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  order_id UUID REFERENCES orders(id),
  payment_config_id UUID REFERENCES payment_configs(id),
  
  provider TEXT NOT NULL,  -- telebirr | cbe_birr | santimpay | chapa
  verification_method TEXT NOT NULL,  -- receipt_upload | reference_check | api_verification
  verification_reference TEXT,
  receipt_image_url TEXT,
  
  amount DECIMAL(12,2),
  currency TEXT DEFAULT 'ETB',
  
  status TEXT DEFAULT 'pending',  -- pending | verified | rejected | disputed
  verified_by UUID REFERENCES employees(id),
  verified_at TIMESTAMPTZ,
  verified_notes TEXT,
  
  -- TallyETBot integration
  external_verification_id TEXT,
  external_verification_data JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add new payment providers
INSERT INTO payment_providers (provider) VALUES ('santimpay'), ('chapa');
```

#### Feature: Fayda ID Verification

```sql
-- Extend employees table with Fayda fields
ALTER TABLE employees ADD COLUMN IF NOT EXISTS fayda_number TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS fayda_verified BOOLEAN DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS fayda_verified_at TIMESTAMPTZ;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS fayda_transaction_id TEXT;

CREATE TABLE fayda_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  
  fayda_number TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  date_of_birth DATE,
  
  verification_status TEXT DEFAULT 'pending',  -- pending | verified | failed | expired
  transaction_id TEXT,
  verification_response JSONB,
  
  verified_by UUID REFERENCES employees(id),
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Feature: Shift Management

```sql
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  
  shift_date DATE NOT NULL,
  shift_type TEXT NOT NULL,  -- morning | afternoon | evening | full_day
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  
  status TEXT DEFAULT 'scheduled',  -- scheduled | active | completed | cancelled | missed
  break_duration_minutes INTEGER DEFAULT 0,
  overtime_minutes INTEGER DEFAULT 0,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE shift_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  shift_id UUID NOT NULL REFERENCES shifts(id),
  
  total_orders_handled INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  total_tips DECIMAL(12,2) DEFAULT 0,
  incidents_reported INTEGER DEFAULT 0,
  
  opened_by UUID REFERENCES employees(id),
  opened_at TIMESTAMPTZ,
  closed_by UUID REFERENCES employees(id),
  closed_at TIMESTAMPTZ,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Feature: Receipt System

```sql
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  
  receipt_type TEXT NOT NULL,  -- thermal_80mm | pdf | qr | email
  receipt_number TEXT NOT NULL,
  
  -- Content (stored for audit)
  receipt_data JSONB,
  receipt_text TEXT,
  receipt_html TEXT,
  
  -- Delivery status
  status TEXT DEFAULT 'generated',  -- generated | sent | failed
  sent_to TEXT,  -- email if emailed
  sent_at TIMESTAMPTZ,
  
  -- QR
  qr_code_data TEXT,
  qr_code_url TEXT,
  
  generated_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Feature: Automatic Backups

```sql
CREATE TABLE backup_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  restaurant_id UUID REFERENCES restaurants(id),
  
  backup_type TEXT NOT NULL,  -- daily | manual | on_demand
  status TEXT DEFAULT 'in_progress',  -- in_progress | completed | failed
  size_bytes BIGINT,
  file_url TEXT,
  checksum TEXT,
  
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  notes TEXT,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Feature: Inventory Forecasting

```sql
CREATE TABLE inventory_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id),
  
  forecast_date DATE NOT NULL,
  predicted_quantity DECIMAL(12,2) NOT NULL,
  confidence_score DECIMAL(5,2),  -- 0.00 to 1.00
  
  -- Reorder recommendation
  reorder_recommended BOOLEAN DEFAULT false,
  recommended_order_quantity DECIMAL(12,2),
  recommended_supplier_id UUID REFERENCES suppliers(id),
  
  -- Based on trends
  daily_usage_rate DECIMAL(12,2),
  lead_time_days INTEGER,
  stockout_risk TEXT DEFAULT 'low',  -- low | medium | high | critical
  
  model_version TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(restaurant_id, ingredient_id, forecast_date)
);
```

### 2.4 Enhanced Audit Trail

The existing `audit_logs` table already captures `actor_id`, `action`, `table_name`, `record_id`, `old_data`, `new_data`, `ip_address`. We need to add device tracking:

```sql
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS device_info TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS session_id TEXT;
```

### 2.5 Entity Relationship Diagram (Textual)

```
organizations (1) ────── (N) branches
organizations (1) ────── (N) profiles
organizations (1) ────── (N) backup_records

branches (1) ────── (N) restaurants
branches (1) ────── (N) receipts

restaurants (1) ──── (N) profiles
restaurants (1) ──── (N) employees
restaurants (1) ──── (N) orders
restaurants (1) ──── (N) tables
restaurants (1) ──── (N) menu_items
restaurants (1) ──── (N) categories
restaurants (1) ──── (N) payment_configs
restaurants (1) ──── (N) inventory_*

employees (1) ────── (N) staff_attendance
employees (1) ────── (N) attendance_logs
employees (1) ────── (N) staff_tips
employees (1) ────── (N) shifts
employees (1) ────── (N) shift_reports
employees (1) ────── (N) fayda_verifications
employees (1) ────── (1) cash_reconciliation (waiter/cashier)
employees (1) ────── (N) receipts

orders (1) ────────── (N) payment_verifications
orders (1) ────────── (N) staff_tips
orders (1) ────────── (1) receipts

cash_reconciliation (1) ──── (1) daily_sales_reports
```

### 2.6 TypeScript Types for New Tables

All new tables need corresponding interfaces in `src/types/database.ts` following the existing pattern. An example:

```typescript
// src/types/database.ts additions

export interface StaffAttendance {
  id: string
  restaurant_id: string
  employee_id: string
  date: string
  clock_in: string | null
  clock_out: string | null
  total_break_minutes: number
  status: 'present' | 'absent' | 'late' | 'half_day' | 'overtime'
  late_minutes: number
  overtime_minutes: number
  notes: string | null
  created_at: string
  updated_at: string
}
```

Follow this pattern for all ~25 new tables. Create a dedicated file `src/types/enterprise.ts` for new types to avoid bloating `database.ts`, or add them inline to `database.ts` matching the existing pattern.

---

## 3. Security Review

### 3.1 Current RLS Status

The application uses Supabase Row Level Security. Existing RLS policies on tables like `orders`, `menu_items`, `profiles`, `employees`, etc. must NOT be modified. All new tables will have their own RLS policies.

### 3.2 RLS Policy Template for New Tables

Every new table requires RLS policies. Follow this pattern:

```sql
-- Example: staff_attendance
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read attendance within their restaurant
CREATE POLICY "Staff can view attendance in their restaurant"
  ON staff_attendance FOR SELECT
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  ));

-- Manager+ can insert/update attendance for their restaurant
CREATE POLICY "Managers can manage attendance"
  ON staff_attendance FOR INSERT
  WITH CHECK (restaurant_id IN (
    SELECT restaurant_id FROM profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'manager', 'owner', 'system_admin')
  ));

-- Employees can update only their own clock-in/out
CREATE POLICY "Employees can update own attendance"
  ON staff_attendance FOR UPDATE
  USING (employee_id IN (
    SELECT id FROM employees WHERE profile_id = auth.uid()
  ))
  WITH CHECK (employee_id IN (
    SELECT id FROM employees WHERE profile_id = auth.uid()
  ));
```

### 3.3 API Authorization Pattern

Every new API route will use the existing `requireAuth()` + `requireRole()` pattern from `src/lib/utils/auth-guard.ts`. Example:

```typescript
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAuth, requireRole } from '@/lib/utils/auth-guard'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const roleError = requireRole(auth, 'manager')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('staff_attendance')
    .select('*, employee:employees(*)')
    .eq('restaurant_id', auth.profile.restaurant_id)
    .order('date', { ascending: false })

  return NextResponse.json({ data })
}
```

### 3.4 Read-Only Enforcement for Owner Role

The owner role requires special handling — read-only access everywhere. Implement a query-level guard:

```typescript
function enforceReadOnly(profile: AuthProfile): boolean {
  return profile.role === 'owner'
}

// In API routes:
export async function POST() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  if (enforceReadOnly(auth.profile)) {
    return NextResponse.json(
      { error: { code: 'READ_ONLY', message: 'Owner accounts have read-only access' } },
      { status: 403 }
    )
  }
  // ... proceed with mutation
}
```

### 3.5 Offline-First Security Considerations

- IndexedDB data must be scoped per restaurant
- Background sync must re-verify auth tokens before replaying mutations
- Conflict resolution must use last-write-wins with server-side validation
- Retry queue must implement exponential backoff and cap at 5 retries

---

## 4. Implementation Plan

### Phase 1: Foundation (Week 1-2)

**Priority: CRITICAL**

| Task | Details | Dependencies |
|------|---------|-------------|
| 1.1 Role expansion | Update DB enums, TS types, permission hierarchy, `use-auth.tsx` | None |
| 1.2 Owner read-only enforcement | Create `enforceReadOnly()` guard, apply to all existing API routes | 1.1 |
| 1.3 Extend `auth-guard.ts` | Add `requireOwner()`, `requireSystemAdmin()`, `requireAdminOrOwner()` helpers | 1.1 |
| 1.4 Update sidebar | Add owner-specific nav items (read-only views); update `allNavItems` role arrays | 1.1 |
| 1.5 Update dashboard redirect | Add `owner` → `/dashboard/owner` to the redirect map in `dashboard/page.tsx` | 1.1 |
| 1.6 Profile employee role sync | Ensure `employees.role` and `profiles.role` are in sync; add migration for existing records | 1.1 |

**Risk:** Low. Role expansion is mechanical and well-understood.

### Phase 2: Owner Dashboard (Week 2-3)

**Priority: HIGH**

| Task | Details | Dependencies |
|------|---------|-------------|
| 2.1 Owner dashboard page | Read-only view of sales, payroll, reports, inventory, attendance, staff performance | 1.1, 1.2 |
| 2.2 Owner report exports | Allow CSV/PDF export (read-only data extract) | 2.1 |
| 2.3 Owner i18n keys | Add `owner.*` keys to `en.ts`, `am.ts`, `om.ts` | 2.1 |

**Risk:** Low. Pure read-only, no mutation paths.

### Phase 3: Attendance System (Week 3-4)

**Priority: HIGH**

| Task | Details | Dependencies |
|------|---------|-------------|
| 3.1 Database tables | Create `staff_attendance`, `attendance_logs` + RLS | None |
| 3.2 TypeScript types | Add to `database.ts` | 3.1 |
| 3.3 API routes | CRUD for attendance; clock-in/out actions | 3.1, 3.2 |
| 3.4 Hooks | `useAttendance()`, `useAttendanceLogs()` patterns matching existing hooks | 3.3 |
| 3.5 Clock-in/out UI | Quick-action button in dashboard header | 3.4 |
| 3.6 Attendance dashboard widget | Today's attendance, late arrivals, absent staff | 3.4 |
| 3.7 Attendance reports page | Monthly view, exportable | 3.4 |
| 3.8 Break tracking | Start/end break within attendance | 3.4 |
| 3.9 Overtime calculation | Auto-calc based on shift vs actual hours | 3.4 |
| 3.10 i18n keys | Add `attendance.*` keys | 3.5 |

**Risk:** Low. Well-understood domain, similar patterns to existing modules.

### Phase 4: End of Day Closing (Week 4-5)

**Priority: HIGH**

| Task | Details | Dependencies |
|------|---------|-------------|
| 4.1 Database tables | `cash_reconciliation`, `daily_sales_reports` + RLS | None |
| 4.2 API routes | Waiter submit, cashier verify, manager approve | 4.1 |
| 4.3 Waiter EOD form | Submit cash/mobile/tip totals for the day | 4.2 |
| 4.4 Cashier EOD verification | Review and verify waiter submissions | 4.2 |
| 4.5 Manager/Inv Mgr approval | Final approval step | 4.2 |
| 4.6 Owner read-only view | View reconciled reports only | 4.2 |
| 4.7 Daily sales report auto-generation | Generate after approval | 4.5 |
| 4.8 i18n keys | Add `eod.*` keys | 4.3 |
| 4.9 Tips auto-settle on EOD approval | ✅ `settleTipsForRestaurant()` utility + approve route auto-settles pending tips + closes open pools; result appended to approval notes | 4.5 |

**Risk:** Medium. Multi-step workflow requires careful state machine handling.

### ~~Phase 5: Waiter Tips~~ ✅ COMPLETED

**Priority: MEDIUM**

| Task | Status |
|------|--------|
| 5.1 Database tables | ✅ `00021_tips_management.sql` — `tip_pools`, `staff_tips`, `tip_distributions` + RLS + indexes |
| 5.2 API routes | ✅ 7 routes: `GET /api/tips` (list+create), `[id]` (get/update/delete), `pools` (list+create), `pools/[id]` (get/update/delete), `distributions` (POST), `payouts` (PUT), `summary` (GET) |
| 5.3 Tip entry UI | ✅ `TipEntry` component — waiter logs cash/mobile/manual tips |
| 5.4 Pool management | ✅ `TipPoolManager` + `TipPoolCard` — create pools, close, distribute by method |
| 5.5 Distribution | ✅ `calculateTipDistribution()` utility — equal split, hours worked, role weighted, sales contribution |
| 5.6 Payout reports | ✅ `TipPayoutReport` + `TipDistributionPanel` — view + mark paid |
| 5.7 Payroll integration | ✅ `formatTipsForPayroll()` utility — groups tips by employee for payroll |
| 5.8 Hooks | ✅ `useTips`, `useCreateTip`, `useUpdateTip`, `useTipPools`, `useTipPoolDetail`, `useCreatePool`, `useDistributePool`, `usePayOut`, `useTipSummary` |
| 5.9 Page | ✅ `/dashboard/tips` — tabs: Add Tip / Tip List / Tip Pools / Payout Reports; waiter sees only entry+list, manager sees all |
| 5.10 i18n keys | ✅ 40 keys each in EN/AM/OM |
| 5.11 RBAC tests | ✅ 6 tests: waiter POST ✓, waiter pool blocked ✓, manager pool ✓, unauthenticated ✓, owner blocked ✓, cross-tenant ✓ |

**Migration:** `supabase/migrations/00021_tips_management.sql`

### ~~Phase 6: Mobile Payment Verification~~ ✅ COMPLETED

**Priority: MEDIUM**

| Task | Status |
|------|--------|
| 6.1 Database table | ✅ `00023_payment_verification.sql` — `payment_verifications` table + `payment_verification_method`/`payment_verification_status` enums + RLS + indexes + trigger |
| 6.2 Provider enum extension | ✅ `santimpay`, `chapa` added to `payment_provider` enum in migration + schema.sql |
| 6.3 Receipt upload | ✅ Reused `ImageUpload` pattern — inline receipt upload in verification form using `payment-qrs` bucket |
| 6.4 Verification workflow | ✅ `GET /api/payments/verify` (list), `POST /api/payments/verify` (create), `GET/PUT /api/payments/verify/[id]` (single + verify/reject with auto order payment) |
| 6.5 Payment verification UI | ✅ `/dashboard/payments/verify` — dual view: verification form + list with verify/reject actions, notes, receipt link |
| 6.6 TallyETBot webhook | ✅ `POST /api/webhooks/tallyet` — accepts `{transaction_id, status, provider, amount, phone, reference, restaurant_id}`, creates verified/rejected payment_verification record |
| 6.7 Sidebar | ✅ `sidebar.paymentVerification` (Shield icon, roles: admin/manager/cashier/system_admin) |
| 6.8 i18n keys | ✅ 28 keys each in EN/AM/OM |

**Note:** TallyETBot webhook accepts external verification data and creates a `payment_verifications` record with `api_verification` method. When verified, the linked order (if `order_id` provided) is auto-updated to `paid` status via the PUT endpoint.

### ~~Phase 7: Fayda ID Verification~~ ✅ COMPLETED

**Priority: MEDIUM**

| Task | Status |
|------|--------|
| 7.1 Database | ✅ `00022_fayda_verification.sql` — `fayda_verifications` table + `fayda_verification_status` enum + RLS + indexes + trigger |
| 7.2 Employee form extension | ✅ `fayda_number` added to `EmployeeFormData`, `employeeSchema`, `employee-form.tsx` (new field), `employees/route.ts` (pass-through on create) |
| 7.3 API routes | ✅ `POST /api/fayda` (verify employee + create record), `GET /api/fayda` (list all), `GET /api/fayda/[id]`, `GET /api/fayda/employee/[employeeId]` (by employee), `POST /api/fayda/verify` (confirm pending) |
| 7.4 Hook | ✅ `useFaydaVerifications()` (list), `useFaydaVerify()` (verify + confirm), `useEmployeeFayda()` (per-employee) |
| 7.5 Components | ✅ `FaydaStatusBadge` (color-coded status), `FaydaVerificationPanel` (verify form + success state), `FaydaList` (verification history cards with confirm action) |
| 7.6 Page | ✅ `/dashboard/fayda` — dual-view: list (history) + verify (employee selector + Fayda number input) |
| 7.7 Sidebar | ✅ `sidebar.fayda` (Shield icon, roles: admin/manager/system_admin) |
| 7.8 i18n keys | ✅ 22 keys each in EN/AM/OM |

**Note:** Fayda API integration uses a mock verify (generates transaction ID and marks verified). Replace with real Fayda API HTTP call when available. The `employees` table already had `fayda_number`, `fayda_verified`, `fayda_verified_at`, `fayda_transaction_id` columns from migration `20260623000001_role_expansion.sql`; the new migration creates the `fayda_verifications` audit trail table.

### Phase 8: Shift Management (Week 7-8)

**Priority: MEDIUM**

| Task | Details | Dependencies |
|------|---------|-------------|
| 8.1 Database tables | `shifts`, `shift_reports` + RLS | None |
| 8.2 API routes | CRUD for shifts, open/close actions | 8.1 |
| 8.3 Shift scheduling UI | Calendar-based shift assignment | 8.2 |
| 8.4 Clock-in/out with shift validation | Must have scheduled shift to clock in | 8.2, 3.5 |
| 8.5 Shift handover reports | Summary at shift close | 8.2 |
| 8.6 i18n keys | Add `shift.*` keys | 8.3 |

**Risk:** Medium. Shift-clock integration needs careful state validation.

### ~~Phase 9: Receipt System~~ ✅ COMPLETED

**Priority: LOW (MVP), HIGH (production)**

| Task | Status |
|------|--------|
| 9.1 Database table | ✅ `00019_receipts.sql` — `receipts` + `receipt_templates`, RLS, indexes, `next_receipt_number()` |
| 9.2 PDF/HTML receipt generation | ✅ `formatReceipt()` in `src/lib/utils/receipt.ts` — thermal text, styled HTML, QR data, JSON |
| 9.3 80mm thermal template | ✅ Plain text thermal format + styled HTML with print CSS |
| 9.4 QR receipt generation | ✅ QR code data included in receipt output |
| 9.5 Email receipt | ✅ `send` endpoint to mark receipt as emailed |
| 9.6 Receipt API | ✅ 5 API routes: list, get, generate, by-order, send |
| 9.7 Receipt UI | ✅ ReceiptCard, ReceiptList, ReceiptPreview (thermal/HTML tabs, print/copy/download), ReceiptGenerator |
| 9.8 Pages | ✅ `/dashboard/receipts` (history + generate), `/dashboard/receipts/[id]` (detail + print) |
| 9.9 Hooks | ✅ `useReceipts`, `useReceipt`, `useGenerateReceipt`, `useSendReceipt` |
| 9.10 i18n keys | ✅ 23 keys each in EN/AM/OM |
| 9.11 RBAC tests | ✅ 7 tests: cashier ✓, waiter ✗, kitchen_staff ✗, inventory_manager ✓, owner ✗, unauthenticated ✗, cross-tenant ✓ |

**Migration:** `supabase/migrations/00019_receipts.sql`

### Phase 10: CRM & Loyalty (Week 10) ✅ COMPLETED

**Priority: HIGH**

| Task | Status |
|------|--------|
| 10.1 Database migration | ✅ `20260623000003_crm_loyalty.sql` — 6 tables (`customers`, `reward_points`, `coupons`, `coupon_redemptions`, `visit_history`, `marketing_campaigns`) + 6 enums + RLS + indexes + triggers |
| 10.2 TypeScript types | ✅ `CustomerProfile`, `RewardPointsTransaction`, `Coupon`, `CouponRedemption`, `VisitHistoryEntry`, `MarketingCampaign` + 6 status/enum type unions |
| 10.3 API routes | ✅ `/api/customers` (GET/POST), `/api/customers/[id]` (GET/PUT/DELETE), `/api/customers/[id]/points` (GET/POST), `/api/customers/[id]/visits` (GET/POST), `/api/coupons` (GET/POST), `/api/coupons/[id]` (GET/PUT/DELETE), `/api/coupons/validate` (POST), `/api/campaigns` (GET/POST), `/api/campaigns/[id]` (GET/PUT/DELETE) |
| 10.4 Utilities | ✅ `src/lib/utils/crm.ts` — 6 functions: `calculateLoyaltyTier`, `calculatePoints`, `getNextTier`, `getTierProgress`, `validateCoupon`, `filterCampaignTargets` |
| 10.5 Hooks | ✅ `src/hooks/use-crm.ts` — 15 hooks: `useCustomers`, `useCustomer`, `useCreateCustomer`, `useUpdateCustomer`, `useCustomerPoints`, `useAddPoints`, `useCustomerVisits`, `useCoupons`, `useCreateCoupon`, `useUpdateCoupon`, `useDeleteCoupon`, `useValidateCoupon`, `useCampaigns`, `useCreateCampaign`, `useUpdateCampaign`, `useDeleteCampaign` |
| 10.6 Components | ✅ `CustomerCard`, `CustomerForm`, `PointsHistory`, `VisitHistory`, `CouponCard`, `LoyaltyTierBadge` |
| 10.7 Pages | ✅ `/dashboard/customers` (list + search + tier filter + pagination), `/dashboard/customers/[id]` (profile + points tab + visits tab), `/dashboard/loyalty` (coupons tab with CRUD + campaigns tab with form) |
| 10.8 Sidebar nav | ✅ `sidebar.customers` (Users icon, admin/manager/system_admin), `sidebar.loyalty` (Award icon, admin/manager/system_admin) |
| 10.9 i18n keys | ✅ 74 keys each in EN/AM/OM |
| 10.10 Schema consolidation | ✅ `schema.sql` updated with CRM/Loyalty table definitions |
| 10.11 RBAC tests | ✅ |

### ~~Phase 11: Inventory Forecasting~~ ✅ COMPLETED

**Priority: LOW**

| Task | Status |
|------|--------|
| 11.1 Database tables | ✅ `00020_inventory_forecasting.sql` — `inventory_forecasts` + `reorder_suggestions`, RLS, indexes, 2 PL/pgSQL generation functions |
| 11.2 Forecasting engine | ✅ Server-side (SQL aggregates via RPC) + client-side (`src/lib/utils/forecast.ts` — 10 functions: moving avg, exponential smoothing, confidence, variance, risk/urgency classifiers, supplier ranker) |
| 11.3 Reorder recommendation algorithm | ✅ Both DB-level (`generate_reorder_suggestions()`) and client-side (`recommendReorderQuantity()`, `determineStockoutRisk()`) |
| 11.4 API routes | ✅ 6 route groups: `GET/POST /api/forecasts` (list+generate), `GET/DELETE /api/forecasts/[id]`, `GET /api/forecasts/current` (today + supplier join), `GET /api/forecasts/low-stock` (high/critical risk), `GET/POST/PUT /api/forecasts/reorder-suggestions` + `[id]`, `GET /api/forecasts/ingredient/[ingredientId]` (30-day) |
| 11.5 Hooks | ✅ 7 hooks: `useForecasts`, `useCurrentForecast`, `useLowStockForecast`, `useReorderSuggestions`, `useGenerateForecast`, `useGenerateReorderSuggestions`, `useActionReorderSuggestion` |
| 11.6 Components | ✅ ForecastCard (predicted qty + risk badge + reorder badge), ReorderSuggestions (urgency-coded cards + action btn), DemandChart (bar sparkline green/yellow/red), KPICards (total/high/critical/reorder counts), SupplierRecommendations (ranked bars) |
| 11.7 Page | ✅ `/dashboard/forecasts` (4-tab: Reorder Suggestions / Demand Forecast / Low Stock Alerts / Supplier Rankings + KPI cards + Generate btn) |
| 11.8 i18n keys | ✅ 28 keys each in EN/AM/OM |

**Migration:** `supabase/migrations/00020_inventory_forecasting.sql`

### Phase 12: Reservations & Waitlist ✅ COMPLETED

**Priority: HIGH**

| Task | Status |
|------|--------|
| 12.1 Database tables | ✅ `20260623000002_reservations.sql` — `reservations`, `reservation_tables`, `waitlist_entries`, `reservation_notifications` + RLS + indexes |
| 12.2 API routes | ✅ 5 route groups: reservations CRUD (`/api/reservations` + `[id]`), availability (`/api/reservations/availability`), waitlist CRUD (`/api/reservations/waitlist` + `[id]`) |
| 12.3 Availability engine | ✅ `findAvailableTables()` + `suggestTableCombinations()` + `isTimeOverlap()` in `src/lib/utils/reservations.ts` |
| 12.4 Hooks | ✅ `useReservations`, `useReservation`, `useCreateReservation`, `useUpdateReservation`, `useCancelReservation`, `useAvailability`, `useWaitlist` |
| 12.5 Calendar view | ✅ `ReservationCalendar` component — day-by-day time-slot grid with status dots |
| 12.6 Reservation form | ✅ `ReservationForm` component — create with table assignment, availability check |
| 12.7 Reservation cards | ✅ `ReservationCard` component — detail display with status badge + action buttons |
| 12.8 Waitlist panel | ✅ `WaitlistPanel` component — add/notify/cancel waitlist entries in real-time |
| 12.9 Page | ✅ `/dashboard/reservations` — 3-tab interface: Calendar / List / Waitlist |
| 12.10 i18n keys | ✅ 34 keys each in EN/AM/OM |
| 12.11 Sidebar | ✅ Added to `allNavItems` for admin/manager/cashier/waiter/system_admin |
| 12.12 TypeScript | ✅ 0 errors — all new types in `src/types/enterprise.ts` (Reservation, WaitlistEntry, etc.) |

**Migration:** `supabase/migrations/20260623000002_reservations.sql`

### ~~Phase 13: Waiter-to-Table Assignment~~ ✅ COMPLETED

**Priority: MEDIUM**

| Task | Status |
|------|--------|
| 13.1 API route | ✅ `PUT/DELETE /api/tables/[id]/assign` — assign/unassign waiter; validates employee role = waiter; requires manager role |
| 13.2 Hook | ✅ `useTableAssignment` — fetches tables with waiter join, provides `assignWaiter()` + `unassignWaiter()` via API with auto-refetch |
| 13.3 Component | ✅ `TableAssignmentView` — 3 sections: By Table (grid + dropdown + unassign), By Waiter (cards with counts), Unassigned Tables (summary) |
| 13.4 Page | ✅ `/dashboard/tables/assign` — back button + title + refresh + assignment view |
| 13.5 Sidebar | ✅ `sidebar.tableAssignment` (UserCircle icon, roles: admin/manager/system_admin) |
| 13.6 i18n keys | ✅ 11 keys each in EN/AM/OM |

**Note:** Existing `assigned_waiter_id` column + FK on `tables` table was already present; this feature built the missing manager-facing assignment API and UI.

### Phase 14: Audit Trail Enhancement (Week 10)

**Priority: LOW (enhancement of existing)**

| Task | Details | Dependencies |
|------|---------|-------------|
| 14.1 Add device/user-agent columns | Migration on `audit_logs` | None |
| 14.2 Server-side audit middleware | Auto-capture IP, user-agent, device in API routes | 14.1 |
| 14.3 Audit log filter UI | Filter by actor, action, table, date range | Existing audit page |
| 14.4 i18n keys | Add `audit.*` extended keys | 14.3 |

**Risk:** Minimal. Enhancements to existing table and page.

### ~~Phase 15: Offline-First Support~~ ✅ COMPLETED (promoted to CRITICAL)

| Task | Status |
|------|--------|
| 15.1 Service Worker | ✅ `public/sw.js` — v3 with network-first-with-timeout for API, cache-first for static assets, cache-busting, offline fallback page, self-skip-waiting + clients-claim for instant activation |
| 15.2 IndexedDB wrapper | ✅ `src/lib/utils/offline-db.ts` — typed wrapper with `OfflineMutation` + `OfflineOrder` interfaces, stores: `offline-mutations`, `offline-orders`, `offline-requests` |
| 15.3 Background Sync API | ✅ SW handles `sync-offline-mutations` and `sync-orders` events; client auto-syncs on reconnect via `useOffline()` hook |
| 15.4 Retry queue | ✅ `offlineDB.addMutation()` / `getMutations()` / `deleteMutation()` / `clearMutations()` — full CRUD queue with replay logic, toast feedback on sync complete/fail |
| 15.5 Offline context + hooks | ✅ `src/hooks/use-offline.tsx` — `OfflineProvider`, `useOnlineStatus()` (`isOnline`, `wasOffline`), `useOfflineQueue()` (`count`, `enqueue`, `dequeue`, `clear`, `sync`, `isSyncing`) |
| 15.6 Offline UI indicator | ✅ `src/components/offline/offline-banner.tsx` — fixed bottom-right banner: amber when offline (WifiOff icon + pending count), blue when online with pending mutations (RefreshCw icon + Sync button) |
| 15.7 Offline fallback page | ✅ `src/app/offline/page.tsx` — detects online/offline state, shows connection status with retry button or dashboard link |
| 15.8 SW registration | ✅ Inline script in root `layout.tsx` — registers SW on load, reloads on activate for instant SW update |
| 15.9 Root layout integration | ✅ `OfflineProvider` wraps children in `layout.tsx` — available to all pages, `OfflineBanner` rendered globally |
| 15.10 i18n keys | ✅ 18 keys each in EN/AM/OM |

**Risk mitigated from HIGH → LOW.** The offline layer uses a simple last-write-wins mutation queue with IndexedDB persistence. The service worker runs on the client edge with a 5-second API timeout. No conflict resolution needed since mutations are replayed in order on reconnect.

### Phase 16: Multi-Branch Scalability & Tenant Context Middleware (Week 12-13)

**Priority: MEDIUM (ongoing)**

| Task | Status |
|------|--------|
| 16.1 Tenant-context middleware | ✅ `src/lib/supabase/middleware.ts` enhanced — fetches profile and injects `x-tenant-restaurant-id`, `x-tenant-role`, `x-tenant-user-id`, `x-tenant-organization-id` headers for API/dashboard routes |
| 16.2 Server-side tenant utility | ✅ `src/lib/utils/tenant.ts` — `requireTenant()`, `requireAdminTenant()`, `requireOwnerTenant()`, `requireSystemAdminTenant()`, `requireRole()`, `requireMutate()` — reads headers first, falls back to DB |
| 16.3 Client-side tenant hook | ✅ `src/hooks/use-tenant.ts` — `useTenant()` returns `{ restaurantId, organizationId, role, userId, isLoaded }` from auth profile |
| 16.4 Organization-level reporting | Pending — aggregate data across branches owned by same organization |
| 16.5 Branch selector in dashboards | Pending — dropdown to switch between branches (admin+ only) |
| 16.6 Branch-specific permissions | Pending — assign roles per branch within organization |
| 16.7 Cross-branch inventory visibility | Pending — optional: view stock across branches |

**Architecture:** Middleware fetches the user's profile (once per request) and injects tenant headers. API routes read headers via `requireTenant()` avoiding a duplicate DB query. The client-side `useTenant()` hook mirrors the server-side tenant info from the existing auth context.

**Migration path:** Existing API routes continue to use `requireAuth()` + `auth.profile.restaurant_id`. New routes should use `requireTenant()` for fewer DB round-trips.

---

## 5. UI/UX Plan

### 5.1 New Dashboard Pages

| Route | Page | Role(s) | Pattern |
|-------|------|---------|---------|
| `/dashboard/owner` | Owner Dashboard (read-only) | `owner` | New page, similar to admin dashboard but no action buttons |
| `/dashboard/owner/reports` | Owner Reports View | `owner` | Read-only report viewer |
| `/dashboard/owner/payroll` | Owner Payroll Viewer | `owner` | Read-only payroll summary |
| `/dashboard/owner/inventory` | Owner Inventory Viewer | `owner` | Read-only inventory overview |
| `/dashboard/owner/attendance` | Owner Attendance Viewer | `owner` | Read-only attendance summary |

### 5.2 New Feature Pages

| Route | Page | Role(s) |
|-------|------|---------|
| `/dashboard/attendance` | Attendance Dashboard | `admin`, `manager`, `owner` |
| `/dashboard/attendance/reports` | Attendance Reports | `admin`, `manager` |
| `/dashboard/shifts` | Shift Management | `admin`, `manager`, `cashier` |
| `/dashboard/shifts/schedule` | Shift Schedule Calendar | `admin`, `manager` |
| `/dashboard/eod` | End of Day Closing | `admin`, `cashier`, `waiter`, `inventory_manager` |
| `/dashboard/tips` | Tips Management | `admin`, `manager`, `waiter` |
| `/dashboard/tables/assign` | Waiter-to-Table Assignment | `admin`, `manager`, `system_admin` |
| `/dashboard/payments/verify` | Payment Verification | `cashier`, `admin` |
| `/dashboard/receipts` | Receipt History | `admin`, `manager`, `cashier` |
| `/dashboard/backups` | Backup Management | `admin`, `system_admin` |
| `/dashboard/forecasts` | Inventory Forecasting | `admin`, `inventory_manager` |
| `/dashboard/fayda` | Fayda ID Verification | `admin` |

### 5.3 Navigation Changes

**Sidebar additions** (`src/components/layout/sidebar.tsx`):

```typescript
const allNavItems: NavItem[] = [
  // existing items...
  
  // New items
  { key: 'sidebar.attendance', href: '/dashboard/attendance', icon: <Clock className="h-4 w-4" />, roles: ['admin', 'manager', 'owner'] },
  { key: 'sidebar.shifts', href: '/dashboard/shifts', icon: <CalendarDays className="h-4 w-4" />, roles: ['admin', 'manager'] },
  { key: 'sidebar.eod', href: '/dashboard/eod', icon: <FileSpreadsheet className="h-4 w-4" />, roles: ['admin', 'cashier', 'waiter', 'inventory_manager', 'manager'] },
  { key: 'sidebar.tips', href: '/dashboard/tips', icon: <DollarSign className="h-4 w-4" />, roles: ['admin', 'manager', 'waiter'] },
  { key: 'sidebar.receipts', href: '/dashboard/receipts', icon: <Printer className="h-4 w-4" />, roles: ['admin', 'manager', 'cashier'] },
  { key: 'sidebar.forecasts', href: '/dashboard/forecasts', icon: <TrendingUp className="h-4 w-4" />, roles: ['admin', 'inventory_manager'] },
  { key: 'sidebar.tableAssignment', href: '/dashboard/tables/assign', icon: <UserCircle className="h-4 w-4" />, roles: ['admin', 'manager', 'system_admin'] },
  { key: 'sidebar.backups', href: '/dashboard/backups', icon: <HardDrive className="h-4 w-4" />, roles: ['admin', 'system_admin'] },
]
```

Add new icons to the import: `Clock, CalendarDays, FileSpreadsheet, Printer, TrendingUp, UserCircle, HardDrive`

### 5.4 Owner Dashboard Mockup (Read-Only)

```
┌─────────────────────────────────────────────────────────┐
│  Owner Dashboard                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│  │Today │ │Month │ │Orders│ │Staff │ │Tables│ │ Avg  │ │
│  │Rev   │ │Rev   │ │      │ │      │ │Occ/To│ │Order │ │
│  │ETB   │ │ETB   │ │  X   │ │  X   │ │ X/Y  │ │ETB X │ │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ │
│                                                          │
│  ┌──────────────────┐  ┌──────────────────┐              │
│  │ Revenue Chart     │  │ Staff Performance│             │
│  │ (read-only)       │  │ (read-only)      │             │
│  └──────────────────┘  └──────────────────┘              │
│                                                          │
│  ┌──────────────────┐  ┌──────────────────┐              │
│  │ Attendance Summary│  │ Low Stock Alerts │             │
│  │ (read-only)       │  │ (read-only)      │             │
│  └──────────────────┘  └──────────────────┘              │
│                                                          │
│  [Export Reports] [View Payroll] [View Inventory]        │
│   (all read-only exports, no mutations)                  │
└─────────────────────────────────────────────────────────┘
```

### 5.5 Mobile Support

All new pages follow existing mobile patterns:
- Responsive grid (1 col mobile → 2 col tablet → 3+ col desktop)
- Sidebar on hamburger menu for all roles
- Tables horizontally scrollable on mobile
- Bottom sheet for forms on mobile where appropriate

---

## 6. Testing Plan

### 6.1 Unit Tests (Vitest)

| Test Suite | Coverage | Priority |
|-----------|----------|----------|
| Permission hierarchy | All 8 roles, `hasPermission()`, `requireRole()` | HIGH |
| Auth guard | `requireAuth()`, `requireAdmin()`, `enforceReadOnly()` | HIGH |
| i18n fallback chain | Missing keys → English → key name | MEDIUM |
| Attendance calculations | Overtime, late minutes, break deductions | MEDIUM |
| EOD state machine | Pending → WaiterSubmitted → CashierVerified → Approved | HIGH |
| Tip aggregation | Sum by employee, period, type | MEDIUM |
| Payroll integration | Tip + attendance → payroll calculation | MEDIUM |
| Inventory forecasting | Usage rate, stockout prediction, reorder qty | LOW |
| Format utilities | Currency, phone, date formatting | MEDIUM |
| Validation rules | Fayda ID format, required fields | MEDIUM |

### 6.2 Integration Tests

| Test | What It Validates | Priority |
|------|-------------------|----------|
| Clock-in flow | POST → row created in attendance + log | HIGH |
| EOD full workflow | Waiter submit → Cashier verify → Approve | HIGH |
| Employee creation with Fayda | Employee created → Fayda verified → Profile created | MEDIUM |
| Payment verification | Upload receipt → Verify → Status update | MEDIUM |
| Shift management | Create → Open → Close flow | MEDIUM |
| Owner read-only enforcement | All endpoints return 403 for mutations | HIGH |
| Attendance → Payroll | Hours worked → payroll net pay | MEDIUM |

### 6.3 Security Tests

| Test | What It Validates | Priority |
|------|-------------------|----------|
| Role-based API access | Each role gets correct 200/403 for each endpoint | HIGH |
| Owner mutation blocked | POST/PUT/DELETE return 403 for owner | CRITICAL |
| Cross-restaurant isolation | Restaurant A cannot access Restaurant B data | HIGH |
| RLS bypass attempts | Direct Supabase queries respect RLS | HIGH |
| Audit log completeness | Sensitive actions are logged | MEDIUM |
| Offline retry auth | Background sync re-verifies tokens | MEDIUM |

### 6.4 E2E Tests (Playwright)

| Test | Scenario | Priority |
|------|----------|----------|
| Full attendance flow | Admin creates shift → Employee clocks in → Views report | HIGH |
| Full EOD flow | Waiter submits → Cashier verifies → Approved → Report generated | HIGH |
| Owner dashboard | Owner logs in → Views all data → Exports report → Tries edit → Blocked | HIGH |
| Tip management | Waiter logs tips → Manager views → Reports export | MEDIUM |
| Multi-branch view | Admin switches branch → Data scoped correctly | MEDIUM |

### 6.5 Testing Infrastructure Notes

- Existing `vitest` config at root level should be extended
- New test files: `src/__tests__/permissions.test.ts`, `src/__tests__/attendance.test.ts`, etc.
- Existing Playwright config already present — add new spec files
- Use `src/__tests__/` directory pattern, or colocate with source files as `*.test.ts`

---

## 7. Production Readiness Review

### 7.1 Performance Considerations

| Concern | Mitigation |
|---------|-----------|
| Dashboard queries with joins | Use materialized views (existing `mv_*` pattern), or add specific indexes |
| EOD report generation | Run as async background job; show "generating" state with Supabase Realtime update |
| Attendance clock-in at scale | Single-row insert; index on `(employee_id, date)` |
| Offline sync conflicts | Last-write-wins with server validation; notify on conflict |
| Thermal receipt generation | Browser-side printing via CSS media queries; no server load |
| Backup size | Incremental backups; compress before storage |
| Multi-branch dashboards | Paginate branch data; lazy-load branch selector |

### 7.2 Index Recommendations

```sql
CREATE INDEX idx_staff_attendance_date ON staff_attendance(restaurant_id, date);
CREATE INDEX idx_staff_attendance_employee ON staff_attendance(employee_id, date);
CREATE INDEX idx_attendance_logs_timestamp ON attendance_logs(restaurant_id, timestamp);
CREATE INDEX idx_cash_reconciliation_date ON cash_reconciliation(restaurant_id, date);
CREATE INDEX idx_staff_tips_employee ON staff_tips(restaurant_id, employee_id);
CREATE INDEX idx_payment_verifications_status ON payment_verifications(restaurant_id, status);
CREATE INDEX idx_shifts_date ON shifts(restaurant_id, shift_date);
CREATE INDEX idx_receipts_order ON receipts(order_id);
CREATE INDEX idx_inventory_forecasts_date ON inventory_forecasts(restaurant_id, forecast_date);
```

### 7.3 Monitoring

- **Existing:** Sentry (via `src/lib/monitoring/sentry.ts` + `src/lib/monitoring/logger.ts`)
- **New:** Add custom Sentry transactions for:
  - EOD closing times (track approval latency)
  - Attendance clock-in failures
  - Offline sync conflicts
  - Receipt generation failures
- **Metrics** (`src/lib/monitoring/metrics.ts`): Add counters for new features

### 7.4 Rollback Plan

Each phase should be independently deployable. If a phase causes issues:

1. **Per-feature feature flags:** Wrap each major feature behind an environment variable
   ```
   NEXT_PUBLIC_FEATURE_ATTENDANCE=true
   NEXT_PUBLIC_FEATURE_EOD=false
   NEXT_PUBLIC_FEATURE_TIPS=true
   ```
2. **Database migrations:** All new tables are additive (no existing table structure changed except role enums and audit log columns). Rollback = `DROP TABLE IF EXISTS` for new tables.
3. **Role enum changes:** ALTER TYPE ... ADD VALUE is non-destructive. Cannot be rolled back easily, but existing apps continue to work with new values unused.
4. **Deployment:** Each phase merges to `main` independently. Vercel auto-deploys. Can rollback via Vercel dashboard.

### 7.5 Feature Flags Implementation

```typescript
// src/lib/feature-flags.ts
export const FEATURES = {
  attendance: process.env.NEXT_PUBLIC_FEATURE_ATTENDANCE === 'true',
  eod: process.env.NEXT_PUBLIC_FEATURE_EOD === 'true',
  tips: process.env.NEXT_PUBLIC_FEATURE_TIPS === 'true',
  fayda: process.env.NEXT_PUBLIC_FEATURE_FAYDA === 'true',
  receipts: process.env.NEXT_PUBLIC_FEATURE_RECEIPTS === 'true',
  shifts: process.env.NEXT_PUBLIC_FEATURE_SHIFTS === 'true',
  backups: process.env.NEXT_PUBLIC_FEATURE_BACKUPS === 'true',
  forecasts: process.env.NEXT_PUBLIC_FEATURE_FORECASTS === 'true',
  offline: process.env.NEXT_PUBLIC_FEATURE_OFFLINE === 'true',
}
```

---

## 8. Risk Assessment

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|-----------|
| 1 | Role enum migration breaks existing auth | LOW | CRITICAL | `ADD VALUE IF NOT EXISTS` — non-destructive. Test first on staging. |
| 2 | Offline sync data conflicts | HIGH | MEDIUM | Last-write-wins. Defer offline until core features stable. |
| 3 | EOD multi-step workflow bugs | MEDIUM | HIGH | State machine with clear transitions; unit test all states. |
| 4 | Owner role accidentally gets mutation access | LOW | CRITICAL | `enforceReadOnly()` guard on EVERY mutation route. Automated security tests. |
| 5 | Thermal receipt formatting across browsers | MEDIUM | LOW | CSS print media queries; test on Chrome/Firefox/Edge. |
| 6 | Fayda API downtime blocks employee creation | LOW | MEDIUM | Make Fayda verification optional (skip + verify later). |
| 7 | Performance degradation from new dashboard queries | LOW | MEDIUM | Use materialized views; add indexes; Vercel edge caching. |
| 8 | Scope creep — trying to deliver all phases at once | MEDIUM | HIGH | Strict phase gating; each phase must be approved before starting next. |
| 9 | Existing `common.ts` Role type vs DB enum mismatch | MEDIUM | HIGH | Create migration to sync; add validation layer. |
| 10 | Dual i18n (`next-intl` unused + custom `lib/i18n/`) confusion | LOW | LOW | `next-intl` package is unused; remove from package.json to avoid confusion. |

---

## 9. Recommended Implementation Order

This order prioritizes features by dependency, risk, and business value.

```
Phase 1 ─── Foundation (Roles + Permissions)
   │
   ├── Phase 2 ─── Owner Dashboard (read-only, high value)
   │
   ├── Phase 3 ─── Attendance System (foundational for payroll)
   │
   ├── Phase 4 ─── End of Day Closing (high ops value)
   │
    ├── Phase 5 ─── Waiter Tips (payroll integration) ✅
    │
    ├── Phase 6 ─── Mobile Payment Verification (ops value)
   │
    ├── Phase 7 ─── Fayda ID Verification (compliance) ✅
   │
   ├── Phase 8 ─── Shift Management (attendance integration)
   │
    ├── Phase 9 ─── Receipt System (customer-facing) ✅
    │
     ├── Phase 10 ── CRM & Loyalty ✅
    │
    ├── Phase 11 ── Inventory Forecasting (nice-to-have) ✅
   │
    ├── Phase 12 ── Reservations & Waitlist ✅
    │
    ├── Phase 13 ── Waiter-to-Table Assignment ✅
    │
    ├── Phase 14 ── Audit Trail Enhancement (security)
    │
     ├── Phase 15 ── Offline-First Support ✅
    │
    └── Phase 16 ── Multi-Branch Polish (ongoing refinement)
```

### Business Value vs. Effort Matrix

```
                    HIGH VALUE
                        │
     Phase 2 (Owner)    │  Phase 3 (Attendance)
     Phase 4 (EOD)      │  Phase 6 (Payment Verify)
                        │
     ───────────────────┼─────────────────── LOW EFFORT
                        │
     Phase 7 (Fayda)    │  Phase 5 (Tips)
      Phase 10 (CRM) ✅   │  Phase 8 (Shifts)
     Phase 12 (Audit)   │  Phase 11 (Forecasting)
                        │
                    LOW VALUE
```

**Recommendation:** Start with Phases 1-4 for the highest value per effort. Phases 5 (Tips), 6 (Payment Verification), 7 (Fayda), 9 (Receipts), 10 (CRM & Loyalty), 11 (Forecasting), 12 (Reservations), 13 (Waiter-to-Table), and 15 (Offline-First) already completed.

---

## 10. Estimated Development Timeline

### Conservative Estimate (1 developer, part-time feature work)

| Phase | Feature | Est. Days | Cumulative |
|-------|---------|-----------|------------|
| 1 | Foundation (Roles/Permissions) | 3 | 3 |
| 2 | Owner Dashboard | 3 | 6 |
| 3 | Attendance System | 5 | 11 |
| 4 | End of Day Closing | 5 | 16 |
| 5 | Waiter Tips ✅ | 3 | 19 |
| 6 | Mobile Payment Verification | 4 | 23 |
| 7 | Fayda ID Verification | 2 | 25 |
| 8 | Shift Management | 4 | 29 |
| 9 | Receipt System ✅ | 5 | 34 |
| 10 | CRM & Loyalty ✅ | 5 | 36 |
| 11 | Inventory Forecasting ✅ | 3 | 39 |
| 12 | Reservations & Waitlist ✅ | 4 | 43 |
| 13 | Waiter-to-Table Assignment ✅ | 2 | 45 |
| 14 | Audit Trail Enhancement | 2 | 47 |
| 15 | Offline-First Support ✅ | 8 | 55 |
| 16 | Multi-Branch Polish | 3 | 58 |
| | **Testing + Buffer (30%)** | 17 | **71 days** |

### Realistic Timeline

| Scenario | Duration | Team |
|----------|----------|------|
| **MVP** (Phases 1-4) | **16 days** | 1 developer |
| **Core** (Phases 1-7) | **25 days** (Phases 5,7 done) | 1 developer |
| **Full** (Phases 1-14, no offline) | **47 days** (Phases 5,9,10,11,12,13 done) | 1-2 developers |
| **Complete** (All 16 phases) | **71 days** | 2 developers |

### Parallelization Opportunities

- Phases 5 (Tips) and 6 (Payment Verify) can be parallelized
- Phase 13 (Waiter-to-Table) and Phase 14 (Audit) can be parallelized
- Phase 11 (Forecasting) and Phase 14 (Audit) can be parallelized

---

## 11. Final Go/No-Go Recommendation

### Go — with conditions ✅

**Recommendation:** Proceed with implementation, but use a **phased, gated approach**.

### Conditions for Go

1. **Phase-gate approval:** Complete each phase fully before starting the next. Each phase must pass:
   - All tests pass
   - Build succeeds (0 errors)
   - Manual QA on staging
   - No regression on existing features

2. **Feature flags:** All new features hidden behind `NEXT_PUBLIC_FEATURE_*` flags. Deploy to production with flags OFF, then enable incrementally.

3. **Database first:** All new tables and migrations must be applied and verified before any application code changes.

4. **MVP focus:** Ship Phases 1-4 first. These deliver the highest business value with lowest risk. Phase 15 (Offline-First) now complete.

5. **One owner per restaurant initially:** The Owner role and its read-only enforcement must be rock-solid before the role is granted to any real user. Automated security tests required.

### Immediate Next Steps (Day 1)

1. Apply database migrations for new role enum values
2. Update TypeScript types in `database.ts` and `common.ts`
3. Update `permissions.ts` hierarchy and `use-auth.tsx`
4. Create `src/lib/feature-flags.ts`
5. Add `enforceReadOnly()` to `auth-guard.ts`
6. Remove unused `next-intl` from `package.json`
7. Write and run permission hierarchy tests

### No-Go Conditions (Re-evaluate if any of these are true)

- Existing build breaks after role type changes
- Existing auth flow (login/register/MFA) no longer works
- Existing RLS policies are affected by new table migrations
- Owner role can mutate data (security test fails)
- Performance regression >20% on existing dashboard pages

---

## Appendix A: Files to Create vs. Modify

### New Files

```
src/types/enterprise.ts              — All new table types
src/lib/feature-flags.ts             — Feature flag constants
src/lib/utils/attendance.ts          — Attendance calculation helpers
src/lib/utils/eod.ts                 — EOD state machine helpers
src/lib/utils/tips.ts                — Tip calculation helpers
src/lib/utils/forecast.ts            — Inventory forecasting engine
src/hooks/use-attendance.ts          — Attendance data hook
src/hooks/use-eod.ts                 — EOD closing hook
src/hooks/use-tips.ts                — Tips hook
src/hooks/use-shifts.ts              — Shift management hook
src/hooks/use-receipts.ts            — Receipts hook
src/hooks/use-fayda.ts               — Fayda verification hook
src/hooks/use-backups.ts             — Backup management hook
src/hooks/use-forecasts.ts           — Forecasting hook
src/components/attendance/*          — Attendance UI components
src/components/eod/*                 — EOD closing UI components
src/components/tips/*                — Tips UI components
src/components/shifts/*              — Shift management UI
src/components/receipts/*            — Receipt UI components
src/components/backups/*             — Backup UI components
src/components/forecasts/*           — Forecasting UI components
src/app/dashboard/owner/page.tsx     — Owner dashboard
src/app/dashboard/owner/*            — Owner sub-pages
src/app/dashboard/attendance/*       — Attendance pages
src/app/dashboard/eod/*              — EOD pages
src/app/dashboard/tips/*             — Tips pages
src/app/dashboard/shifts/*           — Shift pages
src/app/dashboard/receipts/*         — Receipt pages
src/app/dashboard/backups/*          — Backup pages
src/app/dashboard/forecasts/*        — Forecasting pages
src/app/api/attendance/*             — Attendance API routes
src/app/api/eod/*                    — EOD API routes
src/app/api/tips/*                   — Tips API routes
src/app/api/shifts/*                 — Shift API routes
src/app/api/receipts/*               — Receipt API routes
src/app/api/backups/*                — Backup API routes
src/app/api/forecasts/*              — Forecast API routes
src/app/api/fayda/*                  — Fayda verification API
src/__tests__/permissions.test.ts    — Permission tests
src/__tests__/attendance.test.ts     — Attendance tests
src/__tests__/eod.test.ts            — EOD tests
```

### Existing Files to Modify

```
src/types/common.ts                  — Add system_admin, owner to Role
src/types/database.ts                — Extend Profile.role, Employee.role; add new table types
src/types/employee.ts                — Extend EmployeeFormData
src/lib/utils/permissions.ts         — Update hierarchy (8 roles)
src/lib/utils/auth-guard.ts          — Add enforceReadOnly(), requireOwner()
src/hooks/use-auth.tsx               — Update hierarchy in useRequireAuth()
src/hooks/use-employees.ts           — Add Fayda fields to create/update
src/lib/i18n/en.ts                   — Add ~200 new i18n keys
src/lib/i18n/am.ts                   — Add Amharic translations
src/lib/i18n/om.ts                   — Add Oromo translations
src/components/layout/sidebar.tsx    — Add new nav items for all features
src/app/(staff)/dashboard/page.tsx   — Add owner redirect
src/app/(staff)/dashboard/layout.tsx — Add owner role support
src/middleware.ts                    — Add owner route checks if needed
src/components/admin/employee-form.tsx — Add Fayda ID field
src/components/admin/employee-form.tsx — Extend role dropdown
src/app/api/employees/route.ts       — Handle new roles in creation
```

---

## Appendix B: i18n Keys to Add (new `en.ts` sections)

```
owner.*                             — Owner dashboard labels
attendance.*                        — Attendance system labels
eod.*                               — End of day closing labels
tips.*                              — Waiter tips labels
shift.*                             — Shift management labels
receipt.*                           — Receipt system labels
backup.*                            — Backup management labels
forecast.*                          — Inventory forecasting labels
fayda.*                             — Fayda verification labels
payment.verification.*              — Payment verification labels
role.owner                          — Owner role name
role.system_admin                   — System admin role name
```

Approximately 200 new keys. Copy the same pattern from `en.ts` to `am.ts` and `om.ts`.

---

## Appendix C: Supabase Migration SQL

All migration SQL should be placed in `supabase/migrations/` directory following Supabase CLI conventions:

```
supabase/migrations/
  20260623000001_role_expansion.sql
  20260623000002_attendance_tables.sql
  20260623000003_eod_tables.sql
  20260623000004_tips_table.sql
  20260623000005_payment_verification.sql
  20260623000006_fayda_verification.sql
  20260623000007_shift_tables.sql
  20260623000008_receipts_table.sql  → 00019_receipts.sql (actual)
  20260623000009_backups_table.sql
  20260623000010_forecasts_table.sql → 00020_inventory_forecasting.sql (actual)
  20260623000011_audit_enhancements.sql
  20260623000012_indexes.sql
```

---

*End of Expansion Plan*
