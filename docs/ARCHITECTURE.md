# System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 15)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │Customer  │ │ Waiter   │ │ Cashier  │ │ Admin/Manager  │  │
│  │ Portal   │ │Dashboard │ │Dashboard │ │ Dashboard      │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───────┬───────┘  │
│       └────────────┴────────────┴────────────────┘          │
│                        │                                     │
│              ┌─────────┴──────────┐                          │
│              │  Next.js API Routes│                          │
│              │  (Backend for      │                          │
│              │   Frontend)        │                          │
│              └─────────┬──────────┘                          │
└────────────────────────┼────────────────────────────────────┘
                         │
┌────────────────────────┼────────────────────────────────────┐
│              Supabase  │                                     │
│  ┌─────────────────────┴──────────────────┐                 │
│  │           PostgreSQL Database           │                 │
│  │  Row Level Security + Audit Logging    │                 │
│  └────────────────────┬───────────────────┘                 │
│  ┌────────────────────┼───────────────────┐                 │
│  │         Supabase Auth                   │                 │
│  │  Phone + Email + MFA Authentication    │                 │
│  └────────────────────┬───────────────────┘                 │
│  ┌────────────────────┼───────────────────┐                 │
│  │      Supabase Storage                   │                 │
│  │  Food images, Employee docs, QR codes  │                 │
│  └────────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
                         │
┌────────────────────────┼────────────────────────────────────┐
│           External Integrations                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ Telebirr │ │ CBE Birr │ │ Ethiopian│ │ QR Code Gen  │   │
│  │ API      │ │ API      │ │ Banks    │ │ (QR Server)  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### App Router Structure (Next.js 15)
```
/app
  /(customer)        → Public menu pages (no auth)
  /(staff)           → Staff portal (auth required)
    /waiter          → Waiter dashboard
    /cashier         → Cashier dashboard
    /manager         → Manager dashboard
    /admin           → Admin dashboard
  /api               → API routes (Next.js Route Handlers)
```

### Data Flow
1. Customer scans QR → Opens `/(customer)/menu/[tableId]`
2. Pages fetch data via Supabase client with RLS policies
3. Staff authenticate → Supabase Auth → Session stored in cookie
4. Staff actions go through API routes → Supabase mutations
5. Real-time subscriptions for waiter service requests

## Security Layers
- **Network**: HTTPS, rate limiting via Vercel WAF
- **Auth**: Supabase Auth with MFA for admin accounts
- **Database**: Row Level Security (RLS) on all tables
- **API**: Server-side validation, parameterized queries
- **Client**: Input sanitization, CSP headers
