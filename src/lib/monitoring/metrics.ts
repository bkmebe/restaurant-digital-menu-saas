/**
 * Simple in-memory metrics collection for tracking API calls, auth events,
 * and payment events. Respects LOG_LEVEL — when set to 'silent' no events
 * are recorded.
 *
 * The store keeps the last 1000 events and discards older entries.
 */

type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug'

interface BaseMetricEvent {
  timestamp: string
  type: string
}

export interface ApiCallEvent extends BaseMetricEvent {
  type: 'api_call'
  endpoint: string
  method: string
  statusCode: number
  durationMs: number
}

export interface AuthEvent extends BaseMetricEvent {
  type: 'auth'
  event: string
  success: boolean
  userId?: string
}

export interface PaymentEvent extends BaseMetricEvent {
  type: 'payment'
  event: string
  provider: string
  status: string
}

type MetricEvent = ApiCallEvent | AuthEvent | PaymentEvent

const MAX_EVENTS = 1000

const LOG_LEVELS: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
}

const events: MetricEvent[] = []

function isEnabled(): boolean {
  const env = (process.env.LOG_LEVEL ?? 'info').trim().toLowerCase() as LogLevel
  const level = LOG_LEVELS[env] ?? LOG_LEVELS.info
  return level > 0
}

function push(event: MetricEvent): void {
  if (!isEnabled()) return
  events.push(event)
  if (events.length > MAX_EVENTS) {
    events.shift()
  }
}

/**
 * Track an API call.
 */
export function trackApiCall(
  endpoint: string,
  method: string,
  statusCode: number,
  durationMs: number,
): void {
  push({
    timestamp: new Date().toISOString(),
    type: 'api_call',
    endpoint,
    method,
    statusCode,
    durationMs,
  })
}

/**
 * Track an authentication event.
 */
export function trackAuthEvent(
  event: string,
  success: boolean,
  userId?: string,
): void {
  push({
    timestamp: new Date().toISOString(),
    type: 'auth',
    event,
    success,
    userId,
  })
}

/**
 * Track a payment event.
 */
export function trackPaymentEvent(
  event: string,
  provider: string,
  status: string,
): void {
  push({
    timestamp: new Date().toISOString(),
    type: 'payment',
    event,
    provider,
    status,
  })
}

/**
 * Return a snapshot of all recorded events (for debugging or exposing
 * a /metrics endpoint). Returns a shallow copy.
 */
export function getMetrics(): MetricEvent[] {
  return [...events]
}

/**
 * Get a summary count grouped by event type.
 */
export function getMetricsSummary(): Record<string, number> {
  const summary: Record<string, number> = {}
  for (const e of events) {
    summary[e.type] = (summary[e.type] ?? 0) + 1
  }
  return summary
}

/**
 * Clear all recorded events (useful for tests or periodic resets).
 */
export function clearMetrics(): void {
  events.length = 0
}
