import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface SettleTipsResult {
  tips_settled: number
  total_amount: number
  pools_closed: number
}

export async function settleTipsForRestaurant(
  restaurantId: string,
  supabase?: SupabaseClient
): Promise<SettleTipsResult> {
  const sb = supabase ?? await createServerSupabaseClient()

  let result: SettleTipsResult = { tips_settled: 0, total_amount: 0, pools_closed: 0 }

  // 1. Settle all pending/confirmed staff_tips for this restaurant
  const { data: pendingTips } = await sb
    .from('staff_tips')
    .select('id, amount')
    .eq('restaurant_id', restaurantId)
    .in('status', ['pending', 'confirmed'])

  if (pendingTips && pendingTips.length > 0) {
    result.tips_settled = pendingTips.length
    result.total_amount = pendingTips.reduce((sum, tip) => sum + Number(tip.amount), 0)

    await sb
      .from('staff_tips')
      .update({
        status: 'paid_out',
        paid_out_at: new Date().toISOString(),
      })
      .eq('restaurant_id', restaurantId)
      .in('status', ['pending', 'confirmed'])
  }

  // 2. Close all open tip pools for this restaurant
  const { data: openPools } = await sb
    .from('tip_pools')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'open')

  if (openPools && openPools.length > 0) {
    result.pools_closed = openPools.length

    await sb
      .from('tip_pools')
      .update({ status: 'closed' })
      .eq('restaurant_id', restaurantId)
      .eq('status', 'open')
  }

  return result
}
