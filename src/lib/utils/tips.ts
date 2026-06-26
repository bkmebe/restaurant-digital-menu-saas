export type DistributionMethod = 'equal_split' | 'hours_worked' | 'role_weighted' | 'sales_contribution'

export function calculateTipDistribution(
  totalAmount: number,
  employees: Array<{ id: string; weight: number }>,
  method: DistributionMethod,
): Array<{ employee_id: string; amount: number }> {
  if (employees.length === 0) return []
  const totalWeight = employees.reduce((s, e) => s + e.weight, 0)
  if (totalWeight <= 0) return employees.map(e => ({ employee_id: e.id, amount: 0 }))

  return employees.map(e => ({
    employee_id: e.id,
    amount: Math.round((totalAmount * (e.weight / totalWeight)) * 100) / 100,
  }))
}

export function getRoleWeight(role: string): number {
  const weights: Record<string, number> = {
    manager: 1.5,
    cashier: 1.2,
    waiter: 1.0,
    kitchen_staff: 0.8,
    inventory_manager: 1.0,
    admin: 1.5,
    owner: 0,
    system_admin: 0,
  }
  return weights[role] ?? 1.0
}

export function calculatePoolSummary(
  tips: Array<{ amount: number; status: string }>,
  distributions: Array<{ amount: number; is_paid: boolean }>,
): {
  total_collected: number
  total_distributed: number
  total_paid: number
  total_pending: number
  balance: number
} {
  const total_collected = tips.reduce((s, t) => s + t.amount, 0)
  const total_distributed = distributions.reduce((s, d) => s + d.amount, 0)
  const total_paid = distributions.filter(d => d.is_paid).reduce((s, d) => s + d.amount, 0)
  return {
    total_collected,
    total_distributed,
    total_paid,
    total_pending: total_distributed - total_paid,
    balance: total_collected - total_distributed,
  }
}

export function formatTipsForPayroll(
  employeeTips: Array<{
    employee_id: string
    amount: number
    is_paid: boolean
    period_start: string
    period_end: string
  }>,
): Record<string, { total_tips: number; paid_tips: number; pending_tips: number; period: string }> {
  const grouped: Record<string, { total: number; paid: number; pending: number; period: string }> = {}
  for (const tip of employeeTips) {
    const existing = grouped[tip.employee_id]
    if (!existing) {
      grouped[tip.employee_id] = { total: tip.amount, paid: tip.is_paid ? tip.amount : 0, pending: tip.is_paid ? 0 : tip.amount, period: `${tip.period_start} — ${tip.period_end}` }
    } else {
      existing.total += tip.amount
      if (tip.is_paid) {
        existing.paid += tip.amount
      } else {
        existing.pending += tip.amount
      }
    }
  }
  return Object.fromEntries(
    Object.entries(grouped).map(([id, val]) => [
      id,
      { total_tips: val.total, paid_tips: val.paid, pending_tips: val.pending, period: val.period },
    ]),
  )
}
