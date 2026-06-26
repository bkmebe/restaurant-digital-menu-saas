export function calculateDailyUsageRate(
  consumptionHistory: Array<{ date: string; quantity: number }>,
  days: number = 30,
): number {
  const recent = consumptionHistory.slice(-days)
  if (recent.length === 0) return 0
  const total = recent.reduce((sum, r) => sum + r.quantity, 0)
  return total / recent.length
}

export function predictStockoutDate(
  currentStock: number,
  dailyUsageRate: number,
): Date | null {
  if (dailyUsageRate <= 0 || currentStock <= 0) return null
  const daysUntilEmpty = Math.floor(currentStock / dailyUsageRate)
  const date = new Date()
  date.setDate(date.getDate() + daysUntilEmpty)
  return date
}

export function recommendReorderQuantity(
  dailyUsageRate: number,
  leadTimeDays: number,
  reorderLevel: number,
  currentStock: number,
): number {
  const safetyStock = dailyUsageRate * leadTimeDays * 1.5
  const reorderPoint = (dailyUsageRate * leadTimeDays) + safetyStock
  if (currentStock >= reorderPoint) return 0
  return Math.ceil(reorderPoint - currentStock + reorderLevel)
}

export function calculateMovingAverage(
  data: number[],
  windowSize: number = 7,
): number[] {
  const result: number[] = []
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1)
    const window = data.slice(start, i + 1)
    const avg = window.reduce((sum, v) => sum + v, 0) / window.length
    result.push(avg)
  }
  return result
}

export function calculateWeightedMovingAverage(
  data: number[],
  windowSize: number = 7,
): number[] {
  const result: number[] = []
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1)
    const window = data.slice(start, i + 1)
    const weights = window.map((_, j) => j + 1)
    const weightSum = weights.reduce((a, b) => a + b, 0)
    const weighted = window.reduce((sum, v, j) => sum + v * weights[j]!, 0)
    result.push(weighted / weightSum)
  }
  return result
}

export function calculateExponentialSmoothing(
  data: number[],
  alpha: number = 0.3,
): number[] {
  const result: number[] = []
  if (data.length === 0) return result
  result.push(data[0]!)
  for (let i = 1; i < data.length; i++) {
    result.push(alpha * data[i]! + (1 - alpha) * result[i - 1]!)
  }
  return result
}

export function predictNextDay(data: number[]): number {
  if (data.length === 0) return 0
  if (data.length === 1) return data[0]!
  const smoothed = calculateExponentialSmoothing(data, 0.3)
  return smoothed[smoothed.length - 1]!
}

export function calculateConfidenceScore(
  dataLength: number,
  variance: number,
  maxData: number = 90,
): number {
  const dataQuality = Math.min(dataLength / maxData, 1)
  const stabilityScore = Math.max(0, 1 - Math.min(variance, 1))
  return Math.round(Math.min(0.95, (dataQuality * 0.6 + stabilityScore * 0.4)) * 1000) / 1000
}

export function calculateVariance(data: number[]): number {
  if (data.length < 2) return 1
  const mean = data.reduce((a, b) => a + b, 0) / data.length
  const sqDiffs = data.map(v => Math.pow(v - mean, 2))
  const avgSqDiff = sqDiffs.reduce((a, b) => a + b, 0) / data.length
  return avgSqDiff / Math.max(mean, 0.01)
}

export function determineStockoutRisk(
  daysUntilStockout: number,
  leadTimeDays: number,
): 'low' | 'medium' | 'high' | 'critical' {
  if (daysUntilStockout <= 0) return 'critical'
  if (daysUntilStockout <= leadTimeDays) return 'critical'
  if (daysUntilStockout <= leadTimeDays * 2) return 'high'
  if (daysUntilStockout <= leadTimeDays * 3) return 'medium'
  return 'low'
}

export function determineReorderUrgency(
  daysUntilStockout: number,
  leadTimeDays: number,
): 'normal' | 'soon' | 'critical' | 'overdue' {
  if (daysUntilStockout <= 0) return 'overdue'
  if (daysUntilStockout <= leadTimeDays) return 'critical'
  if (daysUntilStockout <= leadTimeDays * 2) return 'soon'
  return 'normal'
}

export function rankSuppliers(
  suppliers: Array<{
    id: string
    name: string
    unit_cost: number | null
    lead_time_days: number | null
    rating?: number | null
    total_purchase_value?: number
  }>,
): Array<{ id: string; name: string; score: number }> {
  const scored = suppliers.map(s => {
    let costScore = 0.5
    let leadScore = 0.3
    let historyScore = 0.2

    if (s.unit_cost !== null) {
      const maxCost = Math.max(...suppliers.map(x => x.unit_cost ?? 0), 1)
      costScore = 0.5 * (1 - (s.unit_cost / maxCost))
    }

    if (s.lead_time_days !== null) {
      const maxLead = Math.max(...suppliers.map(x => x.lead_time_days ?? 1), 1)
      leadScore = 0.3 * (1 - (s.lead_time_days / maxLead))
    }

    const maxHistory = Math.max(...suppliers.map(x => x.total_purchase_value ?? 0), 1)
    if (s.total_purchase_value !== null && s.total_purchase_value !== undefined) {
      historyScore = 0.2 * (s.total_purchase_value / maxHistory)
    }

    return {
      id: s.id,
      name: s.name,
      score: Math.round((costScore + leadScore + historyScore) * 100),
    }
  })

  return scored.sort((a, b) => b.score - a.score)
}
