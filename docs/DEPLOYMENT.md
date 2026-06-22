# Production Deployment Plan

## Overview
Deployment targets: Vercel (frontend) + Supabase (backend/database).

## Prerequisites

### Accounts Required
- [ ] Vercel account (vercel.com)
- [ ] Supabase account (supabase.com)
- [ ] GitHub repository
- [ ] Domain name (optional: custom domain)

### Environment Variables
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_APP_NAME=Restaurant Digital Menu

# Optional: Payment gateways
CHAPA_SECRET_KEY=
YENEPAY_API_KEY=
```

## Step-by-Step Deployment

### 1. Supabase Setup
```bash
# 1. Create new Supabase project
# 2. Run migrations
npx supabase link --project-ref <project-id>
npx supabase db push

# 3. Configure Authentication
# - Enable phone auth (for waiters)
# - Enable email/password auth (for admin)
# - Configure MFA in Supabase Auth settings
# - Set site URL to Vercel deployment URL

# 4. Configure Storage
# - Create bucket: 'menu-images' (public)
# - Create bucket: 'employee-docs' (private)
# - Create bucket: 'qr-codes' (public)

# 5. Configure Row Level Security
# Run RLS policies from migrations
```

### 2. Vercel Deployment
```bash
# 1. Push code to GitHub

# 2. Import repo in Vercel
# - Framework: Next.js
# - Root directory: ./
# - Build command: next build
# - Output directory: .next

# 3. Environment Variables
# Add all variables from .env.example

# 4. Deploy
# Vercel auto-deploys on main branch push

# 5. Custom Domain (optional)
# - Add domain in Vercel dashboard
# - Configure DNS records
```

### 3. Post-Deployment Checklist
- [ ] Supabase Auth configured with correct URLs
- [ ] RLS policies active and tested
- [ ] Storage bucket CORS configured
- [ ] SSL certificate active (Vercel auto)
- [ ] Custom domain working (if configured)
- [ ] Rate limiting active
- [ ] Analytics tracking setup
- [ ] Error monitoring (Sentry or Vercel Analytics)
- [ ] Backup schedule configured (Supabase PITR)

## Monitoring & Maintenance

### Monitoring Tools
- **Vercel Analytics**: Performance, traffic
- **Supabase Dashboard**: Database performance, auth logs
- **Sentry** (optional): Error tracking
- **Uptime monitoring**: Better Uptime or similar

### Backup Strategy
- Supabase Point-in-Time Recovery (PITR) enabled
- Daily automated backups
- Weekly manual exports (SQL dump)
- Backup retention: 30 days

### Scaling Considerations
- **Database**: Supabase auto-scales (upgrade plan as needed)
- **Storage**: CDN-enabled (Supabase Storage with CDN)
- **API**: Vercel Edge Functions for latency-sensitive endpoints
- **Images**: Optimize with next/image, serve via CDN

## Rollback Plan
1. Vercel: Instant rollback to previous deployment in dashboard
2. Database: PITR restore to pre-deployment timestamp
3. Verify rollback with smoke tests

## Security Checklist (Pre-Production)
- [ ] All RLS policies tested
- [ ] MFA enforced for admin accounts
- [ ] Rate limiting configured
- [ ] Security headers set (next.config.ts)
- [ ] Input validation on all API routes
- [ ] Environment variables secret (no hardcoded values)
- [ ] HTTPS enforced
- [ ] CORS restricted
- [ ] CSP headers configured
