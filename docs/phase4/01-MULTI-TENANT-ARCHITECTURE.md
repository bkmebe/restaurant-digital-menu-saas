# Phase 4: Multi-Tenant SaaS Architecture

## Tenant Model
```
Platform (Root)
   └── Restaurant 1
   │     ├── Branch 1 (Addis Ababa)
   │     ├── Branch 2 (Bahir Dar)
   │     └── Users (admin, manager, waiter...)
   └── Restaurant 2
         ├── Branch 1 (Adama)
         └── Users...
```

## New Entities
- **organizations**: Top-level tenant (restaurant chain)
- **branches**: Physical locations (each has own tables, menu, staff)
- **subscription_plans**: pricing tiers (Starter, Growth, Enterprise)
- **subscriptions**: Active subscription per organization
- **invoices**: Billing records

## Tenant Isolation Strategy
1. **Row-Level Security**: Every table has `restaurant_id` or `branch_id`
2. **Separate schemas**: Optional (PostgreSQL schema per tenant for Enterprise)
3. **RLS policies**: Enforce `restaurant_id = auth.restaurant_id()` on all queries
4. **API Middleware**: Extract tenant from JWT claims

## Migration Approach
- Add `restaurant_id` to all existing records (already done)
- Add `branch_id` where needed
- Backfill existing data with default branch
- RLS already uses `restaurant_id` from profiles

## Subscription Plans
```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL, -- 'Starter', 'Growth', 'Enterprise'
  price_monthly DECIMAL,
  price_yearly DECIMAL,
  max_branches INTEGER,
  max_employees INTEGER,
  features JSONB, -- ['kds', 'inventory', 'analytics', 'ai_assistant']
  is_active BOOLEAN
);
```

## Billing
- Monthly subscription per organization
- Overages for extra branches/employees
- Ethiopian Birr (ETB) pricing
- Payment via Telebirr/Chapa/CBE Birr
