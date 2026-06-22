# Phase 1: Digital Ordering System — Architecture

## Flow
```
Customer → Cart → Submit Order → Kitchen Queue → Waiter Notification → Real-time Tracking
```

## Data Flow
1. Customer browses menu → adds items to cart (local state)
2. Customer submits order → POST /api/orders → creates order + order_items
3. Supabase Realtime pushes new order to Kitchen Display System
4. Kitchen updates status → preparing → ready
5. Supabase Realtime pushes status to customer order-tracking page
6. Waiter receives notification → delivers → marks delivered
7. Customer sees "Delivered" → can mark "Completed"

## Order States
```
Pending → Accepted → Preparing → Ready → Delivered → Completed
                                                    ↘ Cancelled
```

## Database Changes
- New `order_status` ENUM values
- `orders` table: new statuses
- Realtime publication for `orders` and `order_items`

## API Endpoints
| Method | Path              | Description          |
|--------|-------------------|----------------------|
| POST   | /api/orders       | Create order (cart)  |
| GET    | /api/orders/:id   | Get order + items    |
| PUT    | /api/orders/:id   | Update order status  |
| GET    | /api/orders?table=| List orders for table|

## Security
- Public POST for customer orders (table-scoped)
- Staff can UPDATE order status
- RLS enforces visibility
