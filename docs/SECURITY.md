# Security Architecture

## Overview
This document outlines the security implementation for the Restaurant Digital Menu system, following OWASP best practices and Ethiopian data protection considerations.

## 1. Authentication (Supabase Auth)

### Strategy
- **Supabase Auth** as the authentication provider
- Email/password for admin, manager, cashier roles
- Phone + password for waiters (Ethiopian phone numbers: +251XXXXXXXXX)
- Magic link option for managers
- JWT tokens with short expiry (15 min access, 7 day refresh)

### MFA Implementation
- Required for all admin accounts
- TOTP-based (Google Authenticator, Authy)
- Enforced at login after password verification
- Recovery codes provided on setup

### Session Management
- HttpOnly cookies for server-side sessions
- SameSite strict policy
- Session invalidation on role change
- Concurrent session limiting (max 3 per user)

## 2. Row Level Security (RLS)

### Policy Matrix

| Table         | Customer | Waiter  | Cashier | Manager | Admin   |
|---------------|----------|---------|---------|---------|---------|
| restaurants   | -        | -       | -       | R       | CRUD    |
| profiles      | -        | R       | R       | R       | CRUD    |
| categories    | R        | R       | R       | R       | CRUD    |
| menu_items    | R        | R       | R       | R       | CRUD    |
| tables        | R        | R (assigned)| R   | R       | CRUD    |
| orders        | -        | CRUD    | RU      | R       | CRUD    |
| order_items   | -        | CRUD    | RU      | R       | CRUD    |
| service_req   | C        | RU (assigned)| R | R       | CRUD    |
| employees     | -        | R       | R       | R       | CRUD    |
| payrolls      | -        | -       | -       | R       | CRUD    |
| payment_cfg   | R        | -       | R       | R       | CRUD    |
| audit_logs    | -        | -       | -       | -       | CRUD    |

*R=Read, C=Create, U=Update, D=Delete*

### RLS Examples
```sql
-- Waiters can only see their assigned tables
CREATE POLICY waiter_tables ON tables
  FOR ALL USING (
    assigned_waiter_id IN (
      SELECT id FROM employees WHERE profile_id = auth.uid()
    )
  );

-- Customers can only read available menu items
CREATE POLICY customer_menu ON menu_items
  FOR SELECT USING (is_available = true);
```

## 3. Data Encryption

### At Rest
- PostgreSQL data encrypted at rest (Supabase managed)
- File storage encrypted via Supabase Storage
- Environment variables for API keys/secrets

### In Transit
- TLS 1.3 for all communications
- HTTPS enforced (HTTP → 301 redirect)
- HSTS headers with 1-year max-age

### Sensitive Data
- Passwords: bcrypt hashed (Supabase Auth default)
- National IDs: Encrypted at application level before storage
- Payroll data: Isolated table with restricted RLS
- Payment configs: Encrypted fields, masked in UI

## 4. API Security

### Rate Limiting
- Vercel WAF rate limiting
- 100 req/min per IP for public endpoints
- 300 req/min per authenticated user
- 10 req/min for auth endpoints (login attempts)
- Burst protection enabled

### Input Validation
- Server-side validation on all API routes
- Zod schemas for request validation
- SQL injection prevention via parameterized queries (Supabase)
- XSS prevention: server-side sanitization, CSP headers

### Headers
```
Content-Security-Policy: default-src 'self'; img-src 'self' https://*.supabase.co; script-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=()
```

## 5. Payroll Data Isolation

- Separate PostgreSQL table with strict RLS
- Only admin role has CRUD access
- Manager role has read-only access
- No external API exposure for payroll endpoints
- Audit logging on all payroll mutations
- Net pay calculations done server-side

## 6. Session Management & Logout

- Server-side session invalidation on logout
- All active sessions cleared on password change
- Inactivity timeout: 30 min for staff, 60 min for admin
- Force logout option in admin panel

## 7. Audit Logging

All state-changing operations are logged:
- Who performed the action
- What was changed (old and new values as JSONB)
- When it happened
- IP address of the actor
- Which table and record was affected

Audit logs are append-only (no delete/update allowed via RLS).

## 8. Additional Measures

- **CORS**: Restricted to production domain
- **Dependency scanning**: Automated via Dependabot
- **Secrets management**: Environment variables via Vercel
- **Regular backups**: Supabase Point-in-Time Recovery
- **Error handling**: No stack traces in production responses
