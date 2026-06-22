# Security Gate Runbook

## Overview

Five CI checks run on every PR and push to main/staging/production. Each check is a pass/fail test. If any critical check fails, the deployment is blocked. No exceptions.

## Deployment Rules

| Result           | Action                 |
| ---------------- | ---------------------- |
| Critical failure | BLOCK                  |
| 2+ warnings      | Manual review          |
| 1 warning        | Deploy with monitoring |
| 0 issues         | Deploy                 |

## Checks

| Check | File | What it detects | Failure = |
|-------|------|-----------------|-----------|
| RLS Isolation | `rls-verify.ts` | Cross-tenant data leak | Blocked |
| RBAC Matrix | `rbac-matrix.ts` | Privilege escalation | Blocked |
| Webhook Security | `webhook-security.ts` | Payment fraud vector | Blocked |
| JWT Forgery | `jwt-forgery.ts` | Auth bypass | Blocked |
| Cross-Tenant Probe | `cross-tenant-probe.ts` | RLS config drift | Blocked |

## Failure Response

### Who investigates

The engineer whose PR triggered the failure.

### SLA

- Investigate: within 1 hour of CI failure notification
- Fix: within 4 hours
- Escalate to tech lead if unresolved after 4 hours
- Escalate to CTO if unresolved after 8 hours

## Override Policy

**Critical failures cannot be overridden.** The five checks test for data leaks, payment fraud, and privilege escalation. If any of these is broken, the deployment is unsafe. Fix the issue, don't bypass the check.

The only exception is a proven test bug. In that case:
1. Create a GitHub issue describing the false positive
2. Get two-person approval (sign-off from a second engineer)
3. Fix the test, not the deployment

## Rollback Procedure

If a deployment passes the security gate but causes a production issue:

1. **Vercel rollback:** `vercel rollback` or use Vercel dashboard
2. **Database rollback:** Use Supabase Point-in-Time Recovery or restore from backup
3. **Verify health:** Check `GET /api/health` returns 200
4. **Log incident:** Create a GitHub issue with:
   - What was deployed
   - What broke
   - How the security gate missed it (if applicable)
5. **Prevent recurrence:** Add a regression test for the missed case

## Required Secrets

These must be set in GitHub Actions secrets:

| Secret | Used by | Source |
|--------|---------|--------|
| `SUPABASE_URL` | rls-verify, rbac-matrix | Supabase project settings |
| `SUPABASE_ANON_KEY` | rls-verify, rbac-matrix | Supabase project settings (anon key, NOT service key) |
| `SUPABASE_SERVICE_ROLE_KEY` | (reserved) | Supabase project settings |
| `STAGING_URL` | rbac-matrix, webhook, jwt, cross-tenant | Staging deployment URL |
| `ADMIN_EMAIL` | rls-verify | Test admin account email |
| `ADMIN_PASSWORD` | rls-verify | Test admin account password |
| `ADMIN_JWT` | jwt-forgery, cross-tenant | Pre-authenticated admin JWT (refresh monthly) |
| `CHAPA_WEBHOOK_SECRET` | webhook-security | Chapa dashboard webhook settings |
| `CHAPA_SECRET_KEY` | (reserved) | Chapa API settings |
| `JWT_SECRET` | (reserved) | App JWT signing secret |

## Adding a New Table to RLS Checks

1. Add the table name to the `PROTECTED_TABLES` array in `tests/security-gate/rls-verify.ts`
2. Commit and push. CI will verify RLS is enforced.
