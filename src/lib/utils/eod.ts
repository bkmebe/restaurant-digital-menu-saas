export type EODStatus = 'pending' | 'waiter_submitted' | 'cashier_verified' | 'manager_approved' | 'approved'

export function canTransition(current: EODStatus, next: EODStatus): boolean {
  const transitions: Record<EODStatus, EODStatus[]> = {
    pending: ['waiter_submitted'],
    waiter_submitted: ['cashier_verified'],
    cashier_verified: ['manager_approved'],
    manager_approved: ['approved'],
    approved: [],
  }
  return transitions[current]?.includes(next) ?? false
}

export function calculateDiscrepancy(
  systemTotal: number,
  countedTotal: number,
): number {
  return countedTotal - systemTotal
}
