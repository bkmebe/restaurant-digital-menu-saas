# Project Status

## Completed
- [x] Phase 11: Restaurant Onboarding Flow
  - [x] Multi-step wizard (6 steps: Welcome → Plan → Restaurant → Tables → Menu → Go Live)
  - [x] Create restaurant via `create_restaurant_setup()` RPC
  - [x] First admin user auto-created on registration
  - [x] First branch auto-created on registration
  - [x] Default tables step (dynamic add/remove)
  - [x] Seed default menu categories with trilingual support
  - [x] Seed demo menu items
  - [x] Redirect to dashboard after completion
  - [x] Fixed route collision: `(onboarding)/` → `onboarding/`

## UI Redesign TODO
- [x] 1. Refine global design tokens and base visual system in `src/app/globals.css`
- [x] 2. Redesign dashboard shell layout container in `src/components/layout/dashboard-shell.tsx`
- [x] 3. Redesign premium sidebar navigation in `src/components/layout/sidebar.tsx`
- [x] 4. Redesign admin dashboard screen UI in `src/app/(staff)/dashboard/admin/page.tsx`
- [x] 5. Run lint/type checks and validate UI integrity

## Phase 12: Real Dashboard Data
- [x] Admin dashboard: fixed low stock query (replaced broken `.lt()` hack with `low_stock_alerts` table), added Revenue today as primary stat card
- [x] Manager dashboard: added Branch Performance section (per-branch order counts and revenue)
- [x] Waiter dashboard: added Current Orders tab (shows active orders for assigned tables)
- [x] Kitchen dashboard: added Orders by Station grid with average prep time per station
- [x] Inventory dashboard: added Recent Purchases and Wastage Metrics cards
