# Phase 10G — Deployment Readiness

## Production Environment Variables

### File: `.env.production`
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# App
NEXT_PUBLIC_APP_URL=https://<your-domain>.com

# Payments
CHAPA_SECRET_KEY=<chapa-secret-key>
CHAPA_API_URL=https://api.chapa.co/v1

# Monitoring (Sentry)
NEXT_PUBLIC_SENTRY_DSN=<sentry-dsn>
SENTRY_AUTH_TOKEN=<sentry-auth-token>

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000

# Encryption
ENCRYPTION_KEY=<32-byte-hex-key>
```

### File: `.env.vercel` (imported in Vercel dashboard)
- All `NEXT_PUBLIC_*` vars
- All secret vars (encrypted)
- Database URL for migrations

## Vercel Configuration

### File: `vercel.json`
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm ci",
  "regions": ["iad1"],
  "crons": [
    {
      "path": "/api/cron/refresh-analytics",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/cleanup-sessions",
      "schedule": "0 0 * * *"
    }
  ]
}
```

## Sentry Integration

```bash
npm install @sentry/nextjs
```

### File: `sentry.client.config.ts`
```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  environment: process.env.VERCEL_ENV || 'development',
})
```

### File: `sentry.server.config.ts`
```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
  environment: process.env.VERCEL_ENV || 'development',
})
```

## Monitoring Setup

### Uptime Monitoring
- Vercel Analytics (built-in)
- Sentry Performance Tracking
- Custom health check endpoint: `/api/health`

### File: `src/app/api/health/route.ts`
```typescript
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  const start = Date.now()
  
  try {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.from('restaurants').select('id', { count: 'exact', head: true })
    
    if (error) throw error
    
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      latency_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 503 })
  }
}
```

## Logging Setup

### Structured Logging with Pino
```bash
npm install pino
```

### File: `src/lib/utils/logger.ts`
```typescript
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
  redact: ['req.headers.authorization', 'req.headers.cookie'],
})
```

## Backup Procedures

### Daily Database Backup
```bash
# Run via GitHub Actions or external cron
pg_dump --format=custom --compress=9 \
  --dbname=$DATABASE_URL \
  --file=backups/restaurant_$(date +%Y%m%d).dump

# Upload to S3-compatible storage
aws s3 cp backups/ s3://restaurant-backups/ --recursive
```

### Disaster Recovery Plan

| Scenario | RTO | RPO | Action |
|----------|-----|-----|--------|
| Database corruption | 4h | 1h | Restore from pg_dump + WAL |
| Region outage | 2h | 15min | Deploy to secondary region |
| Code deployment failure | 15min | 0 | Vercel rollback to previous deployment |
| Security incident | 1h | 0 | Revoke keys, rotate secrets, patch |
| Payment provider outage | 1h | 0 | Fallback to manual payment entry |

### Rollback Strategy
```bash
# Vercel CLI rollback
vercel rollback --yes

# Database rollback
# Step 1: Identify the migration to revert
supabase migration list

# Step 2: Run the down migration
supabase db reset --version <previous-version>
```

## Production Deployment Guide

### Pre-deployment Checklist
- [ ] All migrations applied to production DB
- [ ] Environment variables set in Vercel
- [ ] Sentry DSN configured
- [ ] Custom domain configured
- [ ] SSL certificate valid
- [ ] Rate limiting configured
- [ ] CSP headers tested
- [ ] PWA manifest valid
- [ ] Service worker registered
- [ ] Backup verified

### Deployment Commands
```bash
# Deploy to Vercel
vercel --prod

# Run database migrations
supabase db push

# Verify health
curl https://your-domain.com/api/health

# Monitor
vercel logs --prod
```
