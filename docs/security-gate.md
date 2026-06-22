# Security Gate

Five CI checks run on every pull request and push to `main`, `staging`, and `production`. Each check is a pass/fail test. Critical failures block deployment.

## Purpose of Each Job

| Job | File | What It Detects | Failure Impact |
|-----|------|-----------------|----------------|
| **RLS Isolation** | `tests/security-gate/rls-verify.ts` | Cross-tenant data leaks via RLS policy gaps | Blocks deployment |
| **RBAC Matrix** | `tests/security-gate/rbac-matrix.ts` | Privilege escalation across 30+ role/resource/method pairs | Blocks deployment |
| **Webhook Security** | `tests/security-gate/webhook-security.ts` | Payment fraud vectors (HMAC validation, replay attacks, malformed payloads) | Blocks deployment |
| **JWT Forgery** | `tests/security-gate/jwt-forgery.ts` | Authentication bypass via forged or tampered tokens | Blocks deployment |
| **Cross-Tenant Probe** | `tests/security-gate/cross-tenant-probe.ts` | RLS configuration drift that could leak tenant data | Blocks deployment |

## Required GitHub Secrets

These must be configured in the repository's GitHub Actions secrets:

| Secret | Used By | Source |
|--------|---------|--------|
| `SUPABASE_URL` | rls-verify, rbac-matrix | Supabase project settings |
| `SUPABASE_ANON_KEY` | rls-verify, rbac-matrix | Supabase project settings (anon key, not service key) |
| `SUPABASE_SERVICE_ROLE_KEY` | (reserved) | Supabase project settings |
| `STAGING_URL` | rbac-matrix, webhook-security, jwt-forgery, cross-tenant-probe | Staging deployment URL |
| `ADMIN_EMAIL` | rls-verify | Test admin account email |
| `ADMIN_PASSWORD` | rls-verify | Test admin account password |
| `ADMIN_JWT` | jwt-forgery, cross-tenant-probe | Pre-authenticated admin JWT (refresh monthly) |
| `CHAPA_WEBHOOK_SECRET` | webhook-security | Chapa dashboard webhook settings |
| `CHAPA_SECRET_KEY` | (reserved) | Chapa API settings |
| `JWT_SECRET` | (reserved) | App JWT signing secret |

## Failure Investigation Steps

1. **Identify the failing job** — check the GitHub Actions run summary for which of the 5 jobs failed.
2. **View the logs** — expand the failed step and look for assertion errors or unexpected HTTP status codes.
3. **Run locally** — execute the specific test file to reproduce:
   ```bash
   npx tsx tests/security-gate/<test-file>.ts
   ```
4. **Check recent changes** — if RLS isolation fails, review any modified migration files in `supabase/migrations/`. If JWT forgery fails, review auth middleware changes.
5. **Check Supabase policies** — use the Supabase dashboard SQL editor to verify RLS policies on the affected tables.

### SLA

- Investigate: within 1 hour of CI failure notification
- Fix: within 4 hours
- Escalate to tech lead if unresolved after 4 hours
- Escalate to CTO if unresolved after 8 hours

## Override Policy

**Critical failures cannot be overridden.** The five checks test for data leaks, payment fraud, and privilege escalation. If any check fails, the deployment is unsafe. Fix the issue, don't bypass the check.

The only exception is a proven test bug. In that case:
1. Create a GitHub issue describing the false positive
2. Get two-person approval (sign-off from a second engineer)
3. Fix the test, not the deployment

## Rollback Procedure

If a deployment passes the security gate but causes a production issue:

1. **Vercel rollback:** `vercel rollback` or use the Vercel dashboard
2. **Database rollback:** Use Supabase Point-in-Time Recovery or restore from backup
3. **Verify health:** Check `GET /api/health` returns 200
4. **Log incident:** Create a GitHub issue with:
   - What was deployed
   - What broke
   - How the security gate missed it (if applicable)
5. **Prevent recurrence:** Add a regression test for the missed case

## How to Add New RLS Tables to Tests

1. Open `tests/security-gate/rls-verify.ts`
2. Add the new table name to the `PROTECTED_TABLES` array
3. Commit and push — CI will verify RLS is enforced on the new table
4. Optionally add corresponding role-based access assertions in `tests/security-gate/rbac-matrix.ts`
