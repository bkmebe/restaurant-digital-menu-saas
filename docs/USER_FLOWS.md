# User Flow Diagrams

## 1. Customer Flow

```
START: Customer seated at table
    │
    ├── Scan QR Code on table
    │       │
    │       └── Opens /menu/[tableId]
    │           │
    │           ├── View menu with categories
    │           │   ├── Filter by category
    │           │   ├── Search items
    │           │   ├── Toggle language (EN/AM/OM)
    │           │   └── View item details + price + image
    │           │
    │           ├── [Request Waiter] Button
    │           │   └── Creates service_request (type: waiter)
    │           │       └── Waiter notified in real-time
    │           │
    │           ├── [Request Bill] Button
    │           │   └── Creates service_request (type: bill)
    │           │       └── Cashier/Waiter notified
    │           │
    │           └── [View Payment Methods]
    │               └── Shows Telebirr, CBE Birr, Bank accounts
    │                   └── Redirect to payment app/link
    │
    END: Customer leaves
```

## 2. Waiter Flow

```
START: Waiter logs in (phone + password)
    │
    └── Dashboard shows:
        ├── Assigned tables grid (with status)
        │   └── Click table → View table details + orders
        │
        ├── Active service requests (real-time)
        │   └── Acknowledge → Mark in-progress → Mark resolved
        │
        └── Order tracking
            └── View open orders → Update status
                ├── Preparing → Served
                └── Served → Paid (handoff to cashier)
```

## 3. Cashier Flow

```
START: Cashier logs in
    │
    └── Dashboard shows:
        ├── Open orders
        │   └── Click order → View items, total
        │       └── Process payment (cash, card, mobile)
        │           └── Mark order as paid
        │
        ├── Bill requests
        │   └── Generate receipt → Send to table
        │
        └── View payment methods configured by admin
```

## 4. Manager Flow

```
START: Manager logs in
    │
    └── Dashboard shows:
        ├── Revenue overview (today, this week, this month)
        ├── Charts: daily sales, monthly trends
        ├── Popular menu items ranking
        ├── Employee performance metrics
        ├── Table utilization rates
        └── Payroll summary (view only)
```

## 5. Admin Flow

```
START: Admin logs in (+ MFA if enabled)
    │
    ├── Menu Management
    │   ├── View all items (table)
    │   ├── Add item (form: name, price, category, image, desc)
    │   ├── Edit item (pre-filled form)
    │   ├── Delete item (confirm dialog)
    │   ├── Toggle availability (switch)
    │   └── Manage categories (CRUD)
    │
    ├── Employee Management
    │   ├── View all employees (table)
    │   ├── Add employee (form: name, phone, role, salary, national ID)
    │   ├── Edit employee
    │   ├── Deactivate employee
    │   └── Verify national ID
    │
    ├── Payroll Management
    │   ├── View payroll history
    │   ├── Create new payroll (select month/year)
    │   ├── Process payroll (calculate net pay)
    │   └── Mark as paid
    │
    ├── Table Management
    │   ├── View all tables
    │   ├── Add table (number, capacity)
    │   ├── Assign waiter to table
    │   ├── Generate QR code for table
    │   └── Change table status
    │
    ├── Payment Settings
    │   ├── Configure Telebirr (phone, account name)
    │   ├── Configure CBE Birr (phone, account name)
    │   ├── Configure Bank accounts (bank name, account #)
    │   ├── Upload payment QR codes
    │   └── Set payment links
    │
    └── Audit Logs
        └── View all system actions with timestamps
```
