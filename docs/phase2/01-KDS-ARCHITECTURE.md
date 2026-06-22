# Phase 2: Kitchen Display System — Architecture

## Overview
Dedicated dashboard for kitchen staff with real-time order queue, timers, and performance analytics.

## Kitchen Roles
- **Chef**: View queue, update item status (preparing → ready)
- **Kitchen Manager**: Full control, assign stations, view analytics

## Order Flow in Kitchen
```
New Order (pending)
    │
    ▼
Accepted by Kitchen → [Timer starts]
    │
    ▼
Preparing → [Manual start, timer tracks duration]
    │
    ▼
Ready → [Kitchen marks ready]
    │
    ▼
Delivered → [Waiter picks up]
```

## KDS States per Order Item
- `new` — Just arrived
- `preparing` — Chef started
- `ready` — Completed by kitchen
- `delivered` — Picked up by waiter

## Real-time Architecture
- Supabase Realtime subscriptions on `orders` table
- Filter by restaurant_id and status IN (pending, accepted, preparing)
- Sound notification on new order
- Timer sync across all KDS devices

## UI Design
- Large cards with order number, items, time elapsed
- Color-coded by time: normal (green), warning (yellow, >10min), critical (red, >20min)
- Priority indicators (VIP, large tables, special requests)
- Group by station/order type
- Touch-friendly buttons for status changes
