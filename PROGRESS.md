# Security Gate — Progress Report

## Status: In Progress (Day 1 of 3)

---

## Completed

### 1. Created 5 Security Test Files (tests/security-gate/)
All detect cross-tenant data leaks, RBAC breaks, JWT bypass, payment webhook fraud, RLS config drift.

| File | Purpose | Status |
|------|---------|--------|
| `rls-verify.ts` | RLS isolation — uses anon key + real user session (not service key) | ✅ Done |
| `rbac-matrix.ts` | 30+ role/resource/method pairs | ✅ Done |
| `webhook-security.ts` | 6 attack vectors (HMAC, replay, tampered body, etc.) | ✅ Done |
| `jwt-forgery.ts` | 5 JWT forgery vectors | ✅ Done |
| `cross-tenant-probe.ts` | API-level cross-tenant access probe | ✅ Done |

### 2. Created CI Workflow (.github/workflows/security-gate.yml)
- 5 parallel jobs (rls, rbac, webhook, jwt, cross-tenant)
- Triggers on PR + push to main/staging/production
- No orchestration, no aggregation, no scoring

### 3. Created RUNBOOK.md
- Deployment rules, SLA (1h/4h), escalation, rollback, override policy
- Required secrets table

### 4. Added npm Script
```json
"test:security-gate": "tsx tests/security-gate/rls-verify.ts && tsx tests/security-gate/rbac-matrix.ts && tsx tests/security-gate/webhook-security.ts && tsx tests/security-gate/jwt-forgery.ts && tsx tests/security-gate/cross-tenant-probe.ts"
```

### 5. Fixed rls-verify.ts Critical Bug
- **Before:** Used `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS entirely
- **After:** Signs in as real admin user via anon key, queries with `neq('restaurant_id', ...)`

### 6. Fixed rbac-matrix.ts Security Issue
- **Before:** Used `SERVICE_KEY` for `createClient()`
- **After:** Uses `SUPABASE_ANON_KEY` — anon key is correct for user sign-in

### 7. Created 5 Test Users in Supabase Auth

| Email | Role | ID |
|-------|------|----|
| `admin-a@test.com` | admin | `b515ae1d-fb6a-4d27-9a4f-2a67722236e8` |
| `mgr-a@test.com` | manager | `8c3eaa11-e64b-473b-99a7-cb5feead434b` |
| `cashier-a@test.com` | cashier | `e017ef5c-75f8-4b1e-9ae8-79d33213f54e` |
| `waiter-a1@test.com` | waiter | `a59c895a-9abb-49d6-8422-4ac1d78c2053` |
| `chef-a@test.com` | chef | `4d5efd35-5f2c-4a40-8683-05e832b28dcc` |

All use password: `TestPass123!` (all confirmed, `email_confirm: true`)

### 8. Applied RLS Tenant Isolation Migration
File: `supabase/migrations/00012_rls_tenant_isolation.sql`

Fixed policies on: `payrolls`, `audit_logs`, `tables`, `order_items`, `subscriptions`

All admin/manager policies now scope by `restaurant_id` — cross-tenant leaks blocked.

### 9. Removed Overengineered Files
Removed: `aggregate-results.js`, `deployment-decision.js`

---

## Remaining Setup

### 1. Set GitHub Actions Secrets (8 required)
These must be set in the repo → Settings → Secrets and variables → Actions:

| Secret | Where to find it |
|--------|-----------------|
| `SUPABASE_URL` | `.env.local` → `NEXT_PUBLIC_SUPABASE_URL` |
| `SUPABASE_ANON_KEY` | `.env.local` → `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` → `SUPABASE_SERVICE_ROLE_KEY` (reserved, not used by tests) |
| `STAGING_URL` | Your staging deployment URL |
| `ADMIN_EMAIL` | `admin-a@test.com` |
| `ADMIN_PASSWORD` | `TestPass123!` |
| `ADMIN_JWT` | Generate: sign in as admin-a, extract `access_token` from session (refresh monthly) |
| `CHAPA_WEBHOOK_SECRET` | Your Chapa webhook secret |

**To generate `ADMIN_JWT`:**
```bash
npx tsx -e "
const { createClient } = require('@supabase/supabase-js')
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
s.auth.signInWithPassword({email:'admin-a@test.com',password:'TestPass123!'}).then(({data})=>console.log(data.session?.access_token))
"
```

### 2. Create Missing API Routes
The security tests expect these endpoints to exist. Currently missing or partial:

| Endpoint | Missing Methods | Needed By |
|----------|----------------|-----------|
| `/api/menu/items` (collection) | GET, POST, PUT, DELETE | rbac-matrix, cross-tenant-probe |
| `/api/employees` | GET, PUT, DELETE | rbac-matrix, cross-tenant-probe |
| `/api/payroll` | GET, PUT | rbac-matrix, cross-tenant-probe |
| `/api/admin/audit-logs` | entirely missing | rbac-matrix, cross-tenant-probe |
| `/api/manager/reports` | entirely missing | rbac-matrix, cross-tenant-probe |
| `/api/branches` | entirely missing | rbac-matrix, cross-tenant-probe |
| `/api/subscriptions` | entirely missing | rbac-matrix |
| `/api/restaurant/settings` | entirely missing | rbac-matrix |

### 3. Verify Workflow on a PR
- Create a test PR
- Verify all 5 parallel jobs pass
- Confirm < 2 min runtime

### 4. Add Security Gate Badge to PR Template (optional)

---

## Secrets Reference (DO NOT COMMIT)

| File | Contains |
|------|----------|
| `.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `.env.example` | Template only (placeholder values) |
| `tests/.env.test` | Dummy test values (not real) |

---

## Supabase Project Info

| Property | Value |
|----------|-------|
| Project Ref | `siuwuqitzuejlpvsujdy` |
| URL | `https://siuwuqitzuejlpvsujdy.supabase.co` |
| Name | Resturaat menu's Project |
| Region | Central EU (Frankfurt) |

All secrets are in `.env.local` — that file is your source of truth.
