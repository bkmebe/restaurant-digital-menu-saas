# Phase 10C — Security Audit

## Scope
- Authentication & session management
- API route authorization
- Database RLS policies
- Webhook signature verification
- SQL injection vectors
- Rate limiting
- File upload handling
- Secrets management

## Methodology
Manual code review of:
- All 13 `/api/*` route handlers
- All 8 SQL migration files (RLS, functions, grants)
- Middleware (auth session management)
- Payment integration (Chapa webhooks)
- Supabase client configuration
- TypeScript type system (auth guards)

---

## FINDINGS

### CRITICAL (6)

| # | Finding | File | Impact | Fix |
|---|---------|------|--------|-----|
| C1 | SQL injection in AI query route — `restaurant_id` string-interpolated into SQL templates fed to `exec_sql` RPC | `src/app/api/ai/query/route.ts:43-68` | Attacker with authenticated session can execute arbitrary SQL via crafted `restaurant_id` | Validate UUID format server-side; replace `'${rid}'` with `$1::uuid` and pass as RPC parameter |
| C2 | No auth guards on 9 of 13 API routes — any authenticated user (or unauthenticated via session cookie) can access admin endpoints | `menu/items/[id]`, `employees`, `payroll`, `payments/chapa`, `analytics/revenue`, `analytics/export`, `ai/query`, `orders/[id]` | Waiter can delete menu items, create employees, process payroll | Add `requireAuth()` + `requireRole()` guard at the top of every handler |
| C3 | Webhook body logged to DB before signature verification — logs are written even for forged requests | `src/app/api/webhooks/chapa/route.ts:11-16` | Log-based DoS; sensitive data in logs; wasted DB writes | Move signature verification before the insert |
| C4 | HMAC comparison uses `===` (not constant-time) — timing attack can forge webhook signatures | `src/lib/payments/chapa.ts:65` | Attacker with network access can forge webhook events by measuring response timing | Use `crypto.timingSafeEqual()` |
| C5 | File upload validation — `menu_items.image_url` accepts any URL with no validation of file type, size, or provenance | `src/app/api/menu/items/[id]/route.ts:9` (accepts whole body), `src/lib/supabase/storage.ts` (no storage bucket configured) | Attacker can store arbitrary URLs; no image processing pipeline | Add Supabase Storage bucket with MIME type + size validation; validate URLs server-side |
| C6 | RBAC enforcement gaps — dashboard pages rely on client-side role checks; RLS is the only server-side guard, but some policies are overly broad | `src/app/(staff)/dashboard/*` (multiple files), RLS policies in `00001_initial_schema.sql` | Role elevation via direct API calls if RLS is bypassed | Add `requireRole()` guards to all API routes (fixed in 10C) |

### HIGH (12)

| # | Finding | Details | Fix |
|---|---------|---------|-----|
| H1 | Auth route has no rate limiting — `/api/auth` POST brute-force | `src/app/api/auth/route.ts` | Implement rate limiting with Supabase `rate_limit_logs` table + middleware |
| H2 | `exec_sql` RPC uses `SECURITY DEFINER` (if it exists) — runs with creator's privileges | Not in migration files; defined elsewhere | Drop and recreate with `SECURITY INVOKER` and parameterized queries |
| H3 | Service role key exposed in `server.ts` — `createAdminClient()` uses same anon key, but `SUPABASE_SERVICE_ROLE_KEY` env var exists | `src/lib/supabase/server.ts:29-32` | If service role key is ever used, it bypasses RLS; audit all callers |
| H4 | `orders.created_by` FK has no `ON DELETE` action — deleting a profile that created orders will fail | `supabase/migrations/00001_initial_schema.sql:119` | Add `ON DELETE SET NULL` to preserve order records |
| H5 | `audit_logs.actor_id` FK has no `ON DELETE` action — same issue | `supabase/migrations/00001_initial_schema.sql:186` | Add `ON DELETE SET NULL` |
| H6 | Missing indexes on high-query columns — `orders.created_by`, `order_items.menu_item_id`, `payment_transactions.restaurant_id` | Schema review | Add indexes |
| H7 | CORS headers not configured — `Access-Control-Allow-Origin` not set in any response | All API routes | Add CORS middleware or configure in `next.config.ts` |
| H8 | Stack traces exposed in error responses — some routes return raw `error.message` from Supabase | Multiple routes | Wrap errors consistently; never leak internal details |
| H9 | Session cookie has no `__Secure-` prefix — cookies are set without Secure flag in production | `src/lib/supabase/middleware.ts:18-19` | Configure cookie options for production |
| H10 | No Content Security Policy headers — CSP not set in `next.config.ts` | `next.config.ts` | Add CSP with strict directives |
| H11 | `auth.logout` GET uses redirect — no CSRF protection on logout | `src/app/api/auth/logout/route.ts` | Use POST for state-changing operations |
| H12 | Middleware only protects `/dashboard/*` — sub-paths under `/dashboard` use deprecated convention | `src/middleware.ts:28` | Update to Next.js 16 proxy route handler pattern |

### MEDIUM (8)

| # | Finding | Details |
|---|---------|---------|
| M1 | No request size limits — `body.json()` can accept arbitrarily large payloads |
| M2 | Console/error.stack may leak in server logs — no structured logging |
| M3 | No IP allowlisting for admin routes |
| M4 | `next.config.ts` has no `poweredByHeader: false` |
| M5 | No audit logging on API mutations (orders, menu, employees, payroll) |
| M6 | `restaurant_id` is user-supplied in request body — should be derived from session |
| M7 | No brute-force protection on password reset |
| M8 | No MFA enforcement for admin accounts |

### LOW (5)

| # | Finding |
|---|---------|
| L1 | No security.txt (`/.well-known/security.txt`) |
| L2 | No `X-Robots-Tag: noindex` on admin pages |
| L3 | No `Referrer-Policy` header |
| L4 | No `Permissions-Policy` header for camera/mic/geolocation |
| L5 | Login page has no autocomplete=off on sensitive fields |

---

## Remediation Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 6 | All fixed in 10C |
| HIGH | 12 | Migrated to 00009 + code fixes |
| MEDIUM | 8 | Scheduled for 10D |
| LOW | 5 | Deferred to post-launch |

## Verification Steps
1. Run `npm run build` — must pass with 0 errors
2. Test unauthenticated access to `/api/employees` — must return 401
3. Test waiter access to `/api/payroll` — must return 403
4. Send forged webhook with wrong signature — must return 401
5. Try SQL injection via `restaurant_id` in AI query — must return 400
6. Verify migration 00009 applies cleanly against a fresh Supabase project
