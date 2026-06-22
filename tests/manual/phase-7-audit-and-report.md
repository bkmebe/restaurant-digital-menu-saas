# Phase 7: Final Audit & Report

## Test Execution Matrix
To generate the matrix, run the audit helper at `tests/manual/generate-report.py` after all other phases execute.

## Coverage Summary

| Phase | Area | Test Count | Status |
|-------|------|-----------|--------|
| 1.1 | Baseline — existing Vitest suite | 139 | PASS |
| 1.2 | Baseline — existing Playwright E2E | 0 (not present) | N/A |
| 1.3 | Seed data — restaurant_a (50+ items) | manual | PASS |
| 1.4 | Seed data — restaurant_b (30 items) | manual | PASS |
| 1.5 | Seed data — payroll + employees | manual | PASS |
| 1.6 | Stress seed — 10k orders + 50k audit logs | manual | PASS |
| 1.7 | Image strategy — src verification | grep verify | PASS |
| 2.1 | Login — every role | 6 users × 1 test | PENDING |
| 2.2 | Login — invalid credentials | 1 test | PENDING |
| 2.3 | Session expiry | 1 test | PENDING |
| 2.4 | Protected route redirect | 1 test | PENDING |
| 2.5 | Logout | 1 test | PENDING |
| 3.1 | Admin RBAC — all pages | 1 test (8 pages) | PENDING |
| 3.2 | Waiter RBAC — forbidden pages | 1 test (4 pages) | PENDING |
| 3.3 | Cashier RBAC — forbidden pages | 1 test | PENDING |
| 3.4 | Manager RBAC — boundaries | 1 test | PENDING |
| 3.5 | RLS — cross-tenant orders API | 1 test | PENDING |
| 3.6 | RLS — cross-tenant menu API | 1 test | PENDING |
| 3.7 | RLS — deactivated user | 1 test | PENDING |
| 3.8 | API — waiter cannot POST payroll | 1 test | PENDING |
| 3.9 | API — cashier cannot DELETE menu | 1 test | PENDING |
| 4.1 | Admin journey (Menu CRUD, Employees, Tables, Audit) | 4 tests | PENDING |
| 4.2 | Waiter journey (Tables, Requests, Orders) | 2 tests | PENDING |
| 4.3 | Cashier journey (Process orders, Mark paid) | 1 test | PENDING |
| 4.4 | Manager journey (Dashboard, Reports, Export) | 3 tests | PENDING |
| 4.5 | Kitchen journey (Accept, Update status) | 1 test | PENDING |
| 4.6 | Customer journey (Browse, Request, Bill) | 1 test | PENDING |
| 5.1 | k6 Smoke test | single user | PENDING |
| 5.2 | k6 Load test | 100 concurrent | PENDING |
| 5.3 | k6 Stress test | 200 concurrent | PENDING |
| 6.1 | PWA manifest, SW registration | 5 tests | PENDING |
| 6.2 | Offline navigation, cache serving | 3 tests | PENDING |
| 6.3 | Offline mutation queue | 1 test | PENDING |

## Known Issues / Risks

1. **No service worker detected** — If tests 6.1.2–6.2.2 fail, the app has no PWA offline capability.
2. **beforeinstallprompt** — Only fires in real Chrome, not in headless Playwright. Acceptable.
3. **Deactivated user flow** — If test 3.7 fails, the auth hook does not check `is_active` status.
4. **k6 auth token** — Requires a long-lived admin JWT. Add to CI secrets as `ADMIN_TOKEN`.
5. **Stress seed script** — 10k orders may take 30+ seconds on staging. Batch commits are included.
6. **Image URLs** — Placeholder images may not load if Picsum/Unsplash is blocked in the test env.
7. **Offline CDP** — Requires Chromium with DevTools Protocol access. WebKit/Firefox not tested for offline.
