# Database Schema

## Entity Relationship Overview

```
restaurants 1──N tables
restaurants 1──N menu_items
restaurants 1──N categories
restaurants 1──N employees
restaurants 1──N payrolls
restaurants 1──N payment_configs

tables 1──N orders
tables N──1 waiters (employees)
tables 1──N service_requests

categories 1──N menu_items

orders 1──N order_items
orders 1──N payments

menu_items 1──N order_items
menu_items 1──N menu_item_translations

employees 1──N payrolls
```

## Tables

### restaurants
| Column       | Type         | Description                    |
|-------------|-------------|--------------------------------|
| id          | uuid PK     | Primary key                    |
| name        | text        | Restaurant name                |
| slug        | text UNIQUE | URL-friendly identifier        |
| phone       | text        | Contact phone                  |
| email       | text        | Contact email                  |
| address     | text        | Physical address               |
| currency    | text        | Default: ETB                   |
| tax_rate    | decimal     | Default tax rate               |
| logo_url    | text        | Restaurant logo                |
| is_active   | boolean     | Restaurant active status       |
| created_at  | timestamptz | Created timestamp              |
| updated_at  | timestamptz | Updated timestamp              |

### profiles (extends Supabase auth.users)
| Column       | Type         | Description                    |
|-------------|-------------|--------------------------------|
| id          | uuid PK     | References auth.users          |
| restaurant_id| uuid FK     | References restaurants         |
| role        | enum        | admin, manager, cashier, waiter|
| phone       | text UNIQUE | Phone number                   |
| full_name   | text        | Full name                      |
| avatar_url  | text        | Profile photo                  |
| is_mfa_enabled| boolean   | MFA status                     |
| created_at  | timestamptz | Created timestamp              |

### categories
| Column       | Type         | Description                    |
|-------------|-------------|--------------------------------|
| id          | uuid PK     | Primary key                    |
| restaurant_id| uuid FK     | References restaurants         |
| name        | text        | Category name (English)        |
| name_am     | text        | Category name (Amharic)       |
| name_om     | text        | Category name (Afaan Oromo)   |
| icon        | text        | Emoji or icon identifier       |
| sort_order  | integer     | Display ordering               |
| is_active   | boolean     | Visible on menu                |
| created_at  | timestamptz |                                 |

### menu_items
| Column       | Type         | Description                    |
|-------------|-------------|--------------------------------|
| id          | uuid PK     | Primary key                    |
| restaurant_id| uuid FK     | References restaurants         |
| category_id | uuid FK     | References categories          |
| name        | text        | Item name (English)            |
| name_am     | text        | Item name (Amharic)           |
| name_om     | text        | Item name (Afaan Oromo)       |
| description | text        | Description (English)          |
| description_am| text      | Description (Amharic)         |
| description_om| text      | Description (Afaan Oromo)     |
| price       | decimal     | Current price in ETB           |
| image_url   | text        | Food image URL                 |
| is_available| boolean     | In stock/available             |
| is_featured | boolean     | Featured/special item          |
| sort_order  | integer     | Display ordering               |
| created_at  | timestamptz |                                 |
| updated_at  | timestamptz |                                 |

### tables
| Column       | Type         | Description                    |
|-------------|-------------|--------------------------------|
| id          | uuid PK     | Primary key                    |
| restaurant_id| uuid FK     | References restaurants         |
| table_number| integer     | Table number                   |
| capacity    | integer     | Seating capacity               |
| status      | enum        | available, occupied, cleaning  |
| qr_code_url | text        | QR code image URL              |
| qr_code_data| text        | QR code encoded data           |
| assigned_waiter_id| uuid FK| References employees (waiters) |
| created_at  | timestamptz |                                 |

### employees
| Column       | Type         | Description                    |
|-------------|-------------|--------------------------------|
| id          | uuid PK     | Primary key                    |
| restaurant_id| uuid FK     | References restaurants         |
| profile_id  | uuid FK     | References profiles (nullable) |
| full_name   | text        | Employee full name             |
| phone       | text UNIQUE | Phone number                   |
| email       | text        | Email                          |
| role        | enum        | waiter, cashier, manager       |
| national_id | text        | Ethiopian national ID number   |
| national_id_verified| boolean| ID verification status        |
| digital_employee_id| text | Generated employee ID           |
| salary      | decimal     | Monthly salary in ETB          |
| hire_date   | date        | Date of hire                   |
| is_active   | boolean     | Currently employed             |
| created_at  | timestamptz |                                 |
| updated_at  | timestamptz |                                 |

### payrolls
| Column       | Type         | Description                    |
|-------------|-------------|--------------------------------|
| id          | uuid PK     | Primary key                    |
| restaurant_id| uuid FK     | References restaurants         |
| employee_id | uuid FK     | References employees           |
| month       | integer     | Month (1-12)                   |
| year        | integer     | Year                           |
| salary      | decimal     | Base salary                    |
| bonuses     | decimal     | Additional bonuses             |
| deductions  | decimal     | Deductions                     |
| net_pay     | decimal     | Take-home pay                  |
| status      | enum        | pending, paid, cancelled       |
| paid_at     | timestamptz | Payment timestamp              |
| notes       | text        | Payroll notes                  |
| created_at  | timestamptz |                                 |

### orders
| Column       | Type         | Description                    |
|-------------|-------------|--------------------------------|
| id          | uuid PK     | Primary key                    |
| restaurant_id| uuid FK     | References restaurants         |
| table_id    | uuid FK     | References tables              |
| customer_name| text       | Optional customer name         |
| status      | enum        | open, preparing, served, paid  |
| total_amount| decimal     | Order total                    |
| notes       | text        | Special instructions           |
| created_by  | uuid FK     | References profiles (waiter)   |
| created_at  | timestamptz |                                 |
| updated_at  | timestamptz |                                 |

### order_items
| Column       | Type         | Description                    |
|-------------|-------------|--------------------------------|
| id          | uuid PK     | Primary key                    |
| order_id    | uuid FK     | References orders              |
| menu_item_id| uuid FK     | References menu_items          |
| quantity    | integer     | Quantity ordered               |
| unit_price  | decimal     | Price at time of order         |
| subtotal    | decimal     | quantity * unit_price          |
| notes       | text        | Item-specific notes            |
| created_at  | timestamptz |                                 |

### service_requests
| Column       | Type         | Description                    |
|-------------|-------------|--------------------------------|
| id          | uuid PK     | Primary key                    |
| restaurant_id| uuid FK     | References restaurants         |
| table_id    | uuid FK     | References tables              |
| type        | enum        | waiter, bill, other            |
| status      | enum        | pending, acknowledged, resolved|
| notes       | text        | Customer message               |
| created_at  | timestamptz |                                 |
| resolved_at | timestamptz | Resolution time                |

### payment_configs
| Column       | Type         | Description                    |
|-------------|-------------|--------------------------------|
| id          | uuid PK     | Primary key                    |
| restaurant_id| uuid FK     | References restaurants         |
| provider    | text        | telebirr, cbe_birr, bank       |
| label       | text        | Display name                   |
| account_name| text        | Account holder name            |
| account_number| text       | Account/phone number           |
| qr_image_url| text        | QR code for payment            |
| payment_link| text        | Deep link for payment          |
| bank_name   | text        | CBE, Dashen, Awash             |
| is_active   | boolean     | Currently accepting            |
| sort_order  | integer     | Display order                  |
| created_at  | timestamptz |                                 |

### audit_logs
| Column       | Type         | Description                    |
|-------------|-------------|--------------------------------|
| id          | uuid PK     | Primary key                    |
| restaurant_id| uuid FK     | References restaurants         |
| actor_id    | uuid FK     | References profiles            |
| action      | text        | Action performed               |
| table_name  | text        | Affected table                 |
| record_id   | uuid        | Affected record ID             |
| old_data    | jsonb       | Previous state                 |
| new_data    | jsonb       | New state                      |
| ip_address  | inet        | Actor IP                       |
| created_at  | timestamptz |                                 |

## Row Level Security Policies

Every table has RLS enabled with policies:
- **Customers**: Read-only access to menu_items, categories, tables (by QR)
- **Waiters**: Read/update for assigned tables, orders, service_requests
- **Cashiers**: Read/update for orders, payments
- **Managers**: Read access to analytics data, payroll summaries
- **Admins**: Full CRUD on all tables within their restaurant

## Indexes
- `menu_items(restaurant_id, category_id, is_available)`
- `orders(table_id, status)`
- `service_requests(table_id, status)`
- `employees(restaurant_id, role)`
- `payrolls(employee_id, month, year)`
- `audit_logs(restaurant_id, created_at)`
