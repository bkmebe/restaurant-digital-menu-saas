import { ReservationStatus, WaitlistStatus } from '@/types/enterprise'

interface TimeSlot {
  date: string
  time: string
  durationMinutes: number
}

interface TableInfo {
  id: string
  table_number: number
  capacity: number
}

interface ExistingReservation {
  id: string
  reservation_date: string
  reservation_time: string
  duration_minutes: number
  status: string
  tables?: { table_id: string }[]
}

const VALID_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['seated', 'cancelled', 'no_show'],
  seated: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
}

const VALID_WAITLIST_TRANSITIONS: Record<WaitlistStatus, WaitlistStatus[]> = {
  waiting: ['notified', 'cancelled'],
  notified: ['seated', 'cancelled'],
  seated: [],
  cancelled: [],
}

export function canTransitionReservation(
  current: ReservationStatus,
  next: ReservationStatus,
): boolean {
  return VALID_TRANSITIONS[current]?.includes(next) ?? false
}

export function canTransitionWaitlist(
  current: WaitlistStatus,
  next: WaitlistStatus,
): boolean {
  return VALID_WAITLIST_TRANSITIONS[current]?.includes(next) ?? false
}

export function isTimeOverlap(
  slot1: TimeSlot,
  slot2: TimeSlot,
): boolean {
  if (slot1.date !== slot2.date) return false

  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return (h ?? 0) * 60 + (m ?? 0)
  }

  const start1 = toMinutes(slot1.time)
  const end1 = start1 + slot1.durationMinutes
  const start2 = toMinutes(slot2.time)
  const end2 = start2 + slot2.durationMinutes

  return start1 < end2 && start2 < end1
}

export function findAvailableTables(
  tables: TableInfo[],
  existingReservations: ExistingReservation[],
  slot: TimeSlot,
  guestCount: number,
  excludeReservationId?: string,
): TableInfo[] {
  const activeStatuses = ['pending', 'confirmed', 'seated']

  const conflictingTableIds = new Set<string>()
  for (const r of existingReservations) {
    if (excludeReservationId && r.id === excludeReservationId) continue
    if (!activeStatuses.includes(r.status)) continue
    if (!isTimeOverlap(slot, {
      date: r.reservation_date,
      time: r.reservation_time,
      durationMinutes: r.duration_minutes,
    })) continue
    for (const t of r.tables ?? []) {
      conflictingTableIds.add(t.table_id)
    }
  }

  return tables
    .filter(t => !conflictingTableIds.has(t.id))
    .filter(t => t.capacity >= guestCount)
    .sort((a, b) => a.capacity - b.capacity)
}

export function suggestTableCombinations(
  tables: TableInfo[],
  existingReservations: ExistingReservation[],
  slot: TimeSlot,
  guestCount: number,
): TableInfo[][] {
  const available = findAvailableTables(tables, existingReservations, slot, guestCount)

  const results: TableInfo[][] = []

  const single = available.find(t => t.capacity >= guestCount)
  if (single) {
    results.push([single])
    return results
  }

  for (let i = 0; i < available.length; i++) {
    for (let j = i + 1; j < available.length; j++) {
      if (available[i]!.capacity + available[j]!.capacity >= guestCount) {
        results.push([available[i]!, available[j]!])
      }
    }
  }

  return results
}

export function formatReservationDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}
