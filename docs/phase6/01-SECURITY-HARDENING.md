# Phase 6: Advanced Security Hardening

## Threat Model

| Threat | Impact | Mitigation |
|--------|--------|------------|
| SQL Injection | Data breach | Parameterized queries (Supabase SDK) |
| XSS | Session theft | CSP headers, input sanitization |
| CSRF | State-changing actions | SameSite cookies, CSRF tokens |
| Broken Authentication | Account takeover | MFA, rate limiting, session monitoring |
| Insecure Direct Object References | Data access | RLS policies enforce tenant isolation |
| Mass Assignment | Privilege escalation | Zod validation, server-side only mutations |
| Man-in-the-Middle | Data interception | TLS 1.3, HSTS |
| DDoS | Service disruption | Vercel WAF, rate limiting |
| Payroll Data Exposure | Financial data leak | Payroll isolation table, encryption at rest |
| API Abuse | Resource exhaustion | Rate limiting per user/IP |

## Security Controls Implemented

### 1. MFA for Admin
- TOTP-based (Google Authenticator, Authy)
- Required on first login if enabled
- Recovery codes (10 codes, single-use)

### 2. Device Tracking & Session Monitoring
- Track user-agent, IP, device fingerprint
- Alert on new device login
- Force logout on suspicious activity
- Limit concurrent sessions (max 3 per user)

### 3. Audit Trails
- All mutations logged in audit_logs table
- Payload includes old and new values (JSONB)
- IP address and user agent captured
- Append-only (no delete/update on audit_logs)
- Retention: 90 days online, 1 year archived

### 4. Rate Limiting
- Vercel WAF: 100 req/min public, 300 auth
- Login endpoint: 5 attempts per 15 minutes per IP
- API routes: 60 req/min per authenticated user
- Webhook endpoints: whitelisted provider IPs only

### 5. OWASP Top 10 Protection
| OWASP Category | Implementation |
|----------------|----------------|
| A01 Broken Access Control | RLS policies on all tables |
| A02 Cryptographic Failures | TLS 1.3, encrypted secrets |
| A03 Injection | Supabase parameterized queries |
| A04 Insecure Design | Server-side validation (Zod) |
| A05 Security Misconfiguration | CSP headers, HSTS |
| A06 Vulnerable Components | Dependabot, npm audit |
| A07 Auth Failures | MFA, session monitoring |
| A08 Data Integrity | Signed webhooks, HMAC |
| A09 Logging Failures | Comprehensive audit_logs |
| A10 SSRF | Restricted outbound network |

### 6. API Security
- JWT authentication on all staff endpoints
- Public endpoints limited to read-only + service requests
- CORS restricted to production domains
- Request size limits (1MB max)

### 7. Secure File Uploads
- File type validation (images only for menu)
- Size limit: 5MB per file
- Virus scanning (future: ClamAV integration)
- Storage bucket configured private by default
- Signed URLs with expiry for access

### 8. Payroll Protection
- Separate table with strict RLS
- Admin-only write access
- Manager read-only (no payroll mutation)
- No payroll data in API responses outside admin
- Audit logging on all payroll operations
- Net pay calculated server-side only

### 9. Database Encryption
- All data encrypted at rest (Supabase managed)
- National ID and payroll fields: application-level encryption
- Payment account numbers: encrypted storage
- Encryption key rotation every 90 days
