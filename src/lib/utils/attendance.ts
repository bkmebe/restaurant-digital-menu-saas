export function calculateOvertimeMinutes(clockIn: string, clockOut: string, scheduledEnd: string): number {
  const start = new Date(clockIn)
  const end = new Date(clockOut)
  const scheduled = new Date(clockOut)
  const parts = scheduledEnd.split(':')
  const sh = Number(parts[0]) || 0
  const sm = Number(parts[1]) || 0
  scheduled.setHours(sh, sm, 0, 0)
  const workedMs = end.getTime() - start.getTime()
  const scheduledMs = scheduled.getTime() - new Date(clockIn).getTime()
  const overtimeMs = Math.max(0, workedMs - scheduledMs)
  return Math.round(overtimeMs / 60000)
}

export function calculateLateMinutes(clockIn: string, scheduledStart: string): number {
  const actual = new Date(clockIn)
  const scheduled = new Date(clockIn)
  const parts = scheduledStart.split(':')
  const sh = Number(parts[0]) || 0
  const sm = Number(parts[1]) || 0
  scheduled.setHours(sh, sm, 0, 0)
  const lateMs = Math.max(0, actual.getTime() - scheduled.getTime())
  return Math.round(lateMs / 60000)
}

export function calculateTotalBreakMinutes(breaks: Array<{ start: string; end: string }>): number {
  return breaks.reduce((total, b) => {
    const start = new Date(b.start)
    const end = new Date(b.end)
    return total + Math.round((end.getTime() - start.getTime()) / 60000)
  }, 0)
}
