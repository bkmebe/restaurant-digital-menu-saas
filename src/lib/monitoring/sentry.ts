type SeverityLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug'

export interface SentryContext {
  userId?: string
  tenantId?: string
  restaurantId?: string
  [key: string]: unknown
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Sentry: any = null

try {
  // Dynamic require — @sentry/nextjs is optional (installed via sentry-setup.sh)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  // @ts-ignore -- optional dependency, not installed by default
  Sentry = require('@sentry/nextjs')
} catch {
  Sentry = null
}

export function captureException(
  error: unknown,
  context?: SentryContext,
): string | undefined {
  if (!Sentry) return undefined
  return Sentry.captureException(error, { extra: context })
}

export function captureMessage(
  message: string,
  level: SeverityLevel = 'info',
  context?: SentryContext,
): string | undefined {
  if (!Sentry) return undefined
  return Sentry.captureMessage(message, { level, extra: context })
}

export function setUserContext(userId: string, email?: string): void {
  if (!Sentry) return
  Sentry.setUser({ id: userId, email })
}

export function setTag(key: string, value: string): void {
  if (!Sentry) return
  Sentry.setTag(key, value)
}

export function clearUserContext(): void {
  if (!Sentry) return
  Sentry.setUser(null)
}
