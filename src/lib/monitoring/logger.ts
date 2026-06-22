/**
 * Structured logging utility.
 *
 * Respects the LOG_LEVEL env var:
 *   silent  → no output
 *   error   → only errors
 *   warn    → errors + warnings
 *   info    → errors + warnings + info (default)
 *   debug   → everything
 *
 * In production (NODE_ENV=production) outputs JSON for log aggregation.
 * In development/test outputs a human-readable format.
 * Safe to use in API routes — never throws.
 */

type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug'

const LOG_LEVELS: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
}

let currentLevel: number = resolveLogLevel()

function resolveLogLevel(): number {
  const env = (process.env.LOG_LEVEL ?? 'info').trim().toLowerCase() as LogLevel
  return LOG_LEVELS[env] ?? LOG_LEVELS.info
}

function shouldLog(level: LogLevel): boolean {
  const levelNum = LOG_LEVELS[level] ?? 0
  return levelNum <= currentLevel
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

function formatTimestamp(): string {
  return new Date().toISOString()
}

function serializeData(data: unknown): Record<string, unknown> {
  if (data === null || data === undefined) return {}
  if (typeof data === 'object' && !Array.isArray(data)) return data as Record<string, unknown>
  return { value: data }
}

function makeLogEntry(
  level: string,
  label: string,
  data?: unknown,
): Record<string, unknown> {
  return {
    timestamp: formatTimestamp(),
    level,
    label,
    ...serializeData(data),
  }
}

function getStackTrace(error: unknown): string | undefined {
  if (error instanceof Error) return error.stack
  if (typeof error === 'string') return error
  return undefined
}

function output(entry: Record<string, unknown>): void {
  try {
    if (isProduction()) {
      process.stdout.write(JSON.stringify(entry) + '\n')
    } else {
      const ts = String(entry.timestamp ?? '')
      const lvl = String(entry.level ?? 'INFO')
      const lbl = String(entry.label ?? '')
      const extra = Object.keys(entry).length > 3 ? JSON.stringify(Object.fromEntries(Object.entries(entry).filter(([k]) => !['timestamp', 'level', 'label'].includes(k))), null, 2) : ''
      process.stdout.write(
        `${ts} [${lvl.toUpperCase()}] ${lbl}${extra ? `\n${extra}` : ''}\n`,
      )
    }
  } catch {
    // Silently fail — never throw in a logger
  }
}

function outputError(entry: Record<string, unknown>): void {
  try {
    if (isProduction()) {
      process.stderr.write(JSON.stringify(entry) + '\n')
    } else {
      const ts = String(entry.timestamp ?? '')
      const lvl = String(entry.level ?? 'ERROR')
      const lbl = String(entry.label ?? '')
      const extra = Object.keys(entry).length > 3 ? JSON.stringify(Object.fromEntries(Object.entries(entry).filter(([k]) => !['timestamp', 'level', 'label'].includes(k))), null, 2) : ''
      process.stderr.write(
        `${ts} [${lvl.toUpperCase()}] ${lbl}${extra ? `\n${extra}` : ''}\n`,
      )
    }
  } catch {
    // Silently fail
  }
}

/**
 * Log an informational message.
 */
export function logInfo(label: string, data?: unknown): void {
  if (!shouldLog('info')) return
  output(makeLogEntry('info', label, data))
}

/**
 * Log a warning message.
 */
export function logWarn(label: string, data?: unknown): void {
  if (!shouldLog('warn')) return
  output(makeLogEntry('warn', label, data))
}

/**
 * Log an error with optional error object (which includes stack trace).
 */
export function logError(label: string, error?: unknown, data?: unknown): void {
  if (!shouldLog('error')) return
  const entry = makeLogEntry('error', label, data)
  entry.stack = getStackTrace(error)
  outputError(entry)
}

/**
 * Log a debug message.
 */
export function logDebug(label: string, data?: unknown): void {
  if (!shouldLog('debug')) return
  output(makeLogEntry('debug', label, data))
}
