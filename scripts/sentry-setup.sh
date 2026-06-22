#!/usr/bin/env bash
# =============================================================================
# Sentry Integration Setup — Restaurant Digital Menu
# =============================================================================
# This script creates Sentry configuration files for Next.js (client, server,
# edge). It does NOT install the @sentry/nextjs package — you must do that
# yourself:
#   npm install @sentry/nextjs
#
# After running this script, enable Sentry in next.config.ts:
#   import { withSentryConfig } from '@sentry/nextjs';
#   export default withSentryConfig(nextConfig, { ... });
#
# Source maps upload can be configured via the Sentry CLI or Vercel
# integration. The SENTRY_AUTH_TOKEN must be set as an environment variable.
# =============================================================================

set -euo pipefail

red()   { printf "\033[31m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
blue()  { printf "\033[34m%s\033[0m\n" "$*"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# ─── 1. sentry.client.config.ts ──────────────────────────────────────────────
blue "Creating sentry.client.config.ts..."

cat > sentry.client.config.ts << 'CLIENT'
// This file configures Sentry for the browser/client side.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || ''

Sentry.init({
  dsn: SENTRY_DSN,

  // Performance monitoring sample rate (0 = off, 1 = all).
  // Use a lower value in production to reduce overhead.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Replay session sample rate (for session replays).
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Environment tag shown in Sentry dashboard.
  environment: process.env.NODE_ENV || 'development',

  // Only send events in production by default.
  enabled: process.env.NODE_ENV === 'production',

  // Filter out known noisy errors (e.g. browser extensions).
  beforeSend(event) {
    if (event.exception) {
      const errorMessage = event.exception.values?.[0]?.value ?? ''
      if (
        errorMessage.includes('chrome-extension://') ||
        errorMessage.includes('moz-extension://')
      ) {
        return null
      }
    }
    return event
  },
})

export { Sentry }
CLIENT

green "  ✅ sentry.client.config.ts created"

# ─── 2. sentry.server.config.ts ──────────────────────────────────────────────
blue "Creating sentry.server.config.ts..."

cat > sentry.server.config.ts << 'SERVER'
// This file configures Sentry for the Next.js server side (API routes,
// server components, getServerSideProps, etc.).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || ''

Sentry.init({
  dsn: SENTRY_DSN,

  // Performance monitoring sample rate.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // Environment tag.
  environment: process.env.NODE_ENV || 'development',

  // Only send events in production by default.
  enabled: process.env.NODE_ENV === 'production',

  // Attach request headers for richer context.
  sendDefaultPii: false,
})

export { Sentry }
SERVER

green "  ✅ sentry.server.config.ts created"

# ─── 3. sentry.edge.config.ts ──────────────────────────────────────────────
blue "Creating sentry.edge.config.ts..."

cat > sentry.edge.config.ts << 'EDGE'
// This file configures Sentry for the Next.js Edge Runtime (middleware,
// edge API routes, etc.).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || ''

Sentry.init({
  dsn: SENTRY_DSN,

  // Edge runtime has limited sampling support — keep it simple.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  environment: process.env.NODE_ENV || 'development',
  enabled: process.env.NODE_ENV === 'production',
})

export { Sentry }
EDGE

green "  ✅ sentry.edge.config.ts created"

# ─── 4. src/lib/monitoring/sentry.ts ─────────────────────────────────────────
blue "Creating src/lib/monitoring/sentry.ts..."

mkdir -p src/lib/monitoring

cat > src/lib/monitoring/sentry.ts << 'SENTRYLIB'
// Reusable Sentry helpers for manual instrumentation.
// Import this module in API routes or server actions to capture exceptions
// and set context tags.

import * as Sentry from '@sentry/nextjs'

type SeverityLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug'

export interface SentryContext {
  userId?: string
  tenantId?: string
  restaurantId?: string
  [key: string]: unknown
}

/**
 * Initialize Sentry if not already done (only needed if you bypass the
 * auto-initialization from sentry.*.config.ts — in most cases those config
 * files handle this automatically).
 */
export function initializeSentry(): void {
  if (typeof process !== 'undefined' && process.env.SENTRY_DSN) {
    // Sentry is normally initialized via the config files.  If you need
    // dynamic DSN injection at runtime, uncomment the block below.
    //
    // if (!Sentry.isInitialized()) {
    //   Sentry.init({ dsn: process.env.SENTRY_DSN })
    // }
  }
}

/**
 * Capture an exception with optional context.
 */
export function captureException(
  error: unknown,
  context?: SentryContext,
): string {
  const eventId = Sentry.captureException(error, {
    extra: context,
  })
  return eventId
}

/**
 * Capture a message with a severity level.
 */
export function captureMessage(
  message: string,
  level: SeverityLevel = 'info',
  context?: SentryContext,
): string {
  const eventId = Sentry.captureMessage(message, {
    level,
    extra: context,
  })
  return eventId
}

/**
 * Set user context for all future Sentry events in this request.
 */
export function setUserContext(userId: string, email?: string): void {
  Sentry.setUser({ id: userId, email })
}

/**
 * Set a tag that will be attached to all future Sentry events.
 */
export function setTag(key: string, value: string): void {
  Sentry.setTag(key, value)
}

/**
 * Clear the current user context (e.g. on logout).
 */
export function clearUserContext(): void {
  Sentry.setUser(null)
}
SENTRYLIB

green "  ✅ src/lib/monitoring/sentry.ts created"

# ─── 5. Source maps upload config reminder ────────────────────────────────────
blue ""
blue "────────────────────────────────────────────────────────────"
blue "  Source Maps Upload Configuration"
blue "────────────────────────────────────────────────────────────"
blue ""
blue "  To upload source maps to Sentry during your Vercel / CI build:"
blue ""
blue "  1. Create a Sentry auth token at:"
blue "     https://sentry.io/settings/account/api/auth-tokens/"
blue "     (scope: project:releases)"
blue ""
blue "  2. Set these environment variables in your CI / Vercel:"
blue "       SENTRY_AUTH_TOKEN=<your_token>"
blue "       SENTRY_ORG=<your_org_slug>"
blue "       SENTRY_PROJECT=<your_project_slug>"
blue ""
blue "  3. Add the Sentry webpack plugin config in next.config.ts:"
blue ""
blue '       import { withSentryConfig } from "@sentry/nextjs"'
blue ""
blue "       const nextConfig = { /* your existing config */ }"
blue ""
blue "       export default withSentryConfig(nextConfig, {"
blue '         org: process.env.SENTRY_ORG,'
blue '         project: process.env.SENTRY_PROJECT,'
blue '         authToken: process.env.SENTRY_AUTH_TOKEN,'
blue '         silent: false,'
blue "       })"
blue ""
blue "  That's it! Source maps will be automatically uploaded during"
blue "  production builds."
blue "────────────────────────────────────────────────────────────"

green ""
green "✅ Sentry setup complete!"
green ""
green "Next steps:"
green "  1. npm install @sentry/nextjs"
green "  2. Update next.config.ts with withSentryConfig()"
green "  3. Set SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN in .env.production"
green "  4. Set SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT in CI"
