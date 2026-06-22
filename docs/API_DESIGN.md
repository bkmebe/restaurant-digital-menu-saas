# API Design

## Overview
The system uses Supabase client SDK for most data operations (with RLS enforcement). Next.js API Route Handlers are used for operations requiring server-side logic.

## API Routes

### Authentication

| Method | Endpoint                | Description              | Auth     |
|--------|------------------------|--------------------------|----------|
| POST   | /api/auth/login        | Login (email/phone + pw) | Public   |
| POST   | /api/auth/logout       | Logout                   | Auth     |
| POST   | /api/auth/mfa/verify   | Verify MFA code          | Public   |
| POST   | /api/auth/mfa/setup    | Setup MFA                | Admin    |

### Menu

| Method | Endpoint                    | Description           | Auth     |
|--------|----------------------------|-----------------------|----------|
| GET    | /api/menu?tableId={id}     | Get menu for table    | Public   |
| GET    | /api/menu/items?category={}| Filter items          | Public   |
| POST   | /api/menu/items            | Create menu item      | Admin    |
| PUT    | /api/menu/items/[id]       | Update menu item      | Admin    |
| DELETE | /api/menu/items/[id]       | Delete menu item      | Admin    |
| POST   | /api/menu/categories       | Create category       | Admin    |
| PUT    | /api/menu/categories/[id]  | Update category       | Admin    |
| DELETE | /api/menu/categories/[id]  | Delete category       | Admin    |

### Orders

| Method | Endpoint                    | Description           | Auth       |
|--------|----------------------------|-----------------------|------------|
| GET    | /api/orders?tableId={}     | Get orders for table  | Waiter+    |
| POST   | /api/orders                | Create order          | Waiter     |
| PUT    | /api/orders/[id]           | Update order status   | Waiter/C   |
| GET    | /api/orders/[id]           | Get order details     | Waiter+    |

### Service Requests

| Method | Endpoint                          | Description          | Auth        |
|--------|----------------------------------|----------------------|-------------|
| POST   | /api/service-requests            | Create request       | Public*     |
| GET    | /api/service-requests            | List requests        | Waiter+     |
| PUT    | /api/service-requests/[id]       | Update request status| Waiter+     |

*Public endpoint with tableId verification

### Employees

| Method | Endpoint                    | Description           | Auth     |
|--------|----------------------------|-----------------------|----------|
| GET    | /api/employees             | List employees        | Admin    |
| POST   | /api/employees             | Create employee       | Admin    |
| PUT    | /api/employees/[id]        | Update employee       | Admin    |
| DELETE | /api/employees/[id]        | Deactivate employee   | Admin    |

### Payroll

| Method | Endpoint                    | Description           | Auth     |
|--------|----------------------------|-----------------------|----------|
| GET    | /api/payroll               | List payroll records  | Manager+ |
| POST   | /api/payroll               | Create payroll entry  | Admin    |
| PUT    | /api/payroll/[id]          | Update payroll status | Admin    |
| GET    | /api/payroll/summary       | Payroll summary       | Manager+ |

### Payments

| Method | Endpoint                    | Description                   | Auth     |
|--------|----------------------------|-------------------------------|----------|
| GET    | /api/payments/config       | Get payment configs           | Public   |
| POST   | /api/payments/config       | Add payment method            | Admin    |
| PUT    | /api/payments/config/[id]  | Update payment config         | Admin    |
| DELETE | /api/payments/config/[id]  | Remove payment config         | Admin    |

### Analytics (Manager)

| Method | Endpoint                    | Description           | Auth     |
|--------|----------------------------|-----------------------|----------|
| GET    | /api/analytics/revenue     | Revenue data          | Manager+ |
| GET    | /api/analytics/popular     | Popular items         | Manager+ |
| GET    | /api/analytics/tables      | Table utilization     | Manager+ |
| GET    | /api/analytics/employees   | Employee performance  | Manager+ |

### Tables (Admin)

| Method | Endpoint                    | Description           | Auth     |
|--------|----------------------------|-----------------------|----------|
| GET    | /api/tables                | List tables           | Admin    |
| POST   | /api/tables                | Create table          | Admin    |
| PUT    | /api/tables/[id]           | Update table          | Admin    |
| DELETE | /api/tables/[id]           | Remove table          | Admin    |
| POST   | /api/tables/[id]/qr        | Generate QR code      | Admin    |

## Response Format

### Success
```json
{
  "data": { ... },
  "message": "Operation successful"
}
```

### Error
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

### Pagination
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

## Status Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Rate Limited
- 500: Internal Server Error
