import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole } from '@/lib/utils/tenant'

export async function GET(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'waiter')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const restaurantId = tenant.restaurantId
  if (!restaurantId) return NextResponse.json({ data: null })

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const monthAgo = new Date()
  monthAgo.setDate(monthAgo.getDate() - 30)
  const defaultFrom = from || monthAgo.toISOString().slice(0, 10)
  const defaultTo = to || new Date().toISOString().slice(0, 10)

  const { data: tips, error: tipsError } = await supabase
    .from('staff_tips')
    .select('id, employee_id, amount, tip_type, status, created_at')
    .eq('restaurant_id', restaurantId)
    .gte('created_at', defaultFrom)
    .lte('created_at', `${defaultTo}T23:59:59`)

  if (tipsError) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Database error occurred' } }, { status: 500 })
  }

  const totalTips = tips?.length || 0
  const totalAmount = tips?.reduce((s, t) => s + t.amount, 0) || 0
  const pendingAmount = tips?.filter(t => t.status === 'pending').reduce((s, t) => s + t.amount, 0) || 0
  const confirmedAmount = tips?.filter(t => t.status === 'confirmed').reduce((s, t) => s + t.amount, 0) || 0
  const paidOutAmount = tips?.filter(t => t.status === 'paid_out').reduce((s, t) => s + t.amount, 0) || 0
  const cashAmount = tips?.filter(t => t.tip_type === 'cash').reduce((s, t) => s + t.amount, 0) || 0
  const mobileAmount = tips?.filter(t => t.tip_type === 'mobile').reduce((s, t) => s + t.amount, 0) || 0
  const manualAmount = tips?.filter(t => t.tip_type === 'manual').reduce((s, t) => s + t.amount, 0) || 0

  const { data: pools } = await supabase
    .from('tip_pools')
    .select('id, name, total_collected, total_distributed, status')
    .eq('restaurant_id', restaurantId)
    .gte('pool_period_start', defaultFrom)
    .lte('pool_period_end', defaultTo)

  const openPools = pools?.filter(p => p.status === 'open').length || 0
  const distributedAmount = pools?.reduce((s, p) => s + p.total_distributed, 0) || 0

  return NextResponse.json({
    data: {
      total_tips: totalTips,
      total_amount: totalAmount,
      pending_amount: pendingAmount,
      confirmed_amount: confirmedAmount,
      paid_out_amount: paidOutAmount,
      by_type: { cash: cashAmount, mobile: mobileAmount, manual: manualAmount },
      pools: { total: pools?.length || 0, open: openPools, distributed: distributedAmount },
      period: { from: defaultFrom, to: defaultTo },
    },
  })
}
