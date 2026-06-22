# Folder Structure

```
restaurant-digital-menu/
├── .env.local                    # Environment variables
├── .env.example                  # Example env template
├── next.config.ts                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies
│
├── docs/                         # Project documentation
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── FOLDER_STRUCTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── USER_FLOWS.md
│   ├── SECURITY.md
│   ├── API_DESIGN.md
│   ├── ROADMAP.md
│   ├── PAYMENT_INTEGRATION.md
│   └── DEPLOYMENT.md
│
├── public/                       # Static assets
│   ├── images/                   # Placeholder images
│   ├── locales/                  # i18n translation files
│   │   ├── en.json
│   │   ├── am.json
│   │   └── om.json
│   └── qr-codes/                 # Generated QR codes
│
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Landing page
│   │   ├── globals.css           # Global styles
│   │   │
│   │   ├── (customer)/           # Public customer routes
│   │   │   └── menu/
│   │   │       └── [tableId]/
│   │   │           ├── page.tsx  # Main menu view
│   │   │           └── loading.tsx
│   │   │
│   │   ├── (auth)/               # Authentication routes
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── mfa/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (staff)/              # Staff dashboard routes
│   │   │   └── dashboard/
│   │   │       ├── layout.tsx    # Dashboard layout with sidebar
│   │   │       ├── page.tsx      # Role-based redirect
│   │   │       │
│   │   │       ├── waiter/
│   │   │       │   ├── page.tsx
│   │   │       │   └── requests/
│   │   │       │       └── page.tsx
│   │   │       │
│   │   │       ├── cashier/
│   │   │       │   └── page.tsx
│   │   │       │
│   │   │       ├── manager/
│   │   │       │   ├── page.tsx
│   │   │       │   ├── payroll/
│   │   │       │   │   └── page.tsx
│   │   │       │   └── reports/
│   │   │       │       └── page.tsx
│   │   │       │
│   │   │       └── admin/
│   │   │           ├── page.tsx
│   │   │           ├── menu/
│   │   │           │   ├── page.tsx
│   │   │           │   ├── new/
│   │   │           │   │   └── page.tsx
│   │   │           │   └── [id]/
│   │   │           │       ├── page.tsx
│   │   │           │       └── edit/
│   │   │           │           └── page.tsx
│   │   │           ├── categories/
│   │   │           │   └── page.tsx
│   │   │           ├── employees/
│   │   │           │   ├── page.tsx
│   │   │           │   ├── new/
│   │   │           │   │   └── page.tsx
│   │   │           │   └── [id]/
│   │   │           │       └── page.tsx
│   │   │           ├── tables/
│   │   │           │   ├── page.tsx
│   │   │           │   └── [id]/
│   │   │           │       └── page.tsx
│   │   │           ├── payments/
│   │   │           │   └── page.tsx
│   │   │           └── audit-logs/
│   │   │               └── page.tsx
│   │   │
│   │   └── api/                  # API Route Handlers
│   │       ├── auth/
│   │       │   └── route.ts
│   │       ├── menu/
│   │       │   └── route.ts
│   │       ├── orders/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       └── route.ts
│   │       ├── service-requests/
│   │       │   └── route.ts
│   │       ├── payments/
│   │       │   └── route.ts
│   │       └── employees/
│   │           └── route.ts
│   │
│   ├── components/               # Shared components
│   │   ├── ui/                   # Shadcn UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── toast.tsx
│   │   │   └── skeleton.tsx
│   │   │
│   │   ├── layout/               # Layout components
│   │   │   ├── header.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── sidebar-nav.tsx
│   │   │   ├── mobile-nav.tsx
│   │   │   └── dashboard-shell.tsx
│   │   │
│   │   ├── customer/             # Customer-facing components
│   │   │   ├── menu-grid.tsx
│   │   │   ├── menu-item-card.tsx
│   │   │   ├── category-filter.tsx
│   │   │   ├── search-bar.tsx
│   │   │   ├── language-switcher.tsx
│   │   │   ├── service-request-buttons.tsx
│   │   │   └── payment-methods-display.tsx
│   │   │
│   │   ├── waiter/               # Waiter components
│   │   │   ├── table-card.tsx
│   │   │   ├── service-request-card.tsx
│   │   │   └── order-status.tsx
│   │   │
│   │   ├── admin/                # Admin components
│   │   │   ├── menu-item-form.tsx
│   │   │   ├── menu-item-list.tsx
│   │   │   ├── employee-form.tsx
│   │   │   ├── employee-list.tsx
│   │   │   ├── table-form.tsx
│   │   │   ├── table-list.tsx
│   │   │   ├── payment-settings-form.tsx
│   │   │   └── category-form.tsx
│   │   │
│   │   ├── manager/              # Manager components
│   │   │   ├── revenue-chart.tsx
│   │   │   ├── sales-summary.tsx
│   │   │   ├── popular-items.tsx
│   │   │   ├── employee-performance.tsx
│   │   │   └── table-utilization.tsx
│   │   │
│   │   └── shared/               # Shared utility components
│   │       ├── loading-spinner.tsx
│   │       ├── error-boundary.tsx
│   │       ├── empty-state.tsx
│   │       ├── confirm-dialog.tsx
│   │       ├── image-upload.tsx
│   │       ├── data-table.tsx
│   │       └── status-badge.tsx
│   │
│   ├── lib/                      # Library code
│   │   ├── supabase/
│   │   │   ├── client.ts         # Supabase client init
│   │   │   ├── server.ts         # Server-side Supabase client
│   │   │   ├── middleware.ts     # Auth middleware
│   │   │   └── admin.ts          # Admin client (service role)
│   │   │
│   │   ├── i18n/
│   │   │   ├── config.ts         # i18n configuration
│   │   │   ├── dictionary.ts     # Translation dictionary
│   │   │   ├── en.ts
│   │   │   ├── am.ts
│   │   │   └── om.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── cn.ts             # Classname utility
│   │   │   ├── format.ts         # Currency, date formatters
│   │   │   ├── validators.ts     # Form validation helpers
│   │   │   └── permissions.ts    # Role-based permission check
│   │   │
│   │   └── constants.ts          # App-wide constants
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── use-auth.ts
│   │   ├── use-menu.ts
│   │   ├── use-orders.ts
│   │   ├── use-service-requests.ts
│   │   ├── use-payments.ts
│   │   ├── use-employees.ts
│   │   ├── use-tables.ts
│   │   ├── use-role.ts
│   │   └── use-language.ts
│   │
│   └── types/                    # TypeScript type definitions
│       ├── database.ts           # Supabase database types
│       ├── menu.ts
│       ├── order.ts
│       ├── employee.ts
│       ├── payment.ts
│       ├── table.ts
│       ├── service-request.ts
│       └── common.ts
│
└── supabase/                     # Supabase configuration
    ├── migrations/               # SQL migration files
    │   └── 00001_initial_schema.sql
    ├── seed.sql                  # Seed data
    └── config.toml               # Supabase project config
```
