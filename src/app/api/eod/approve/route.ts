import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole, requireMutate } from '@/lib/utils/tenant'
import { settleTipsForRestaurant } from '@/lib/utils/tips-settlement'

export async function POST(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'admin')
  if (roleError) return roleError

  const mutateError = requireMutate(tenant)
  if (mutateError) return mutateError

  const supabase = await createServerSupabaseClient()
  const profileId = tenant.userId

  const body = await request.json()
  const { eod_closing_id, status, notes } = body as {
    eod_closing_id: string
    status: 'approved' | 'rejected'
    notes?: string
  }

  if (!eod_closing_id || !status) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'eod_closing_id and status are required' } }, { status: 400 })
  }

  if (!['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'Status must be approved or rejected' } }, { status: 400 })
  }

  // Get the EOD closing
  const { data: closing, error: closingError } = await supabase
    .from('eod_closings')
    .select('*')
    .eq('id', eod_closing_id)
    .single()

  if (closingError || !closing) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'EOD closing not found' } }, { status: 404 })
  }

  if (closing.status !== 'closed') {
    return NextResponse.json({ error: { code: 'INVALID_STATUS', message: `Cannot approve EOD with status: ${closing.status}` } }, { status: 409 })
  }

  // Auto-settle tips when approving
  let settleNotes = ''
  if (status === 'approved') {
    try {
      const settleResult = await settleTipsForRestaurant(closing.restaurant_id, supabase)
      if (settleResult.tips_settled > 0 || settleResult.pools_closed > 0) {
        const parts: string[] = []
        if (settleResult.tips_settled > 0) {
          parts.push(`Tips settled: ${settleResult.tips_settled} tips (${settleResult.total_amount.toFixed(2)})`)
        }
        if (settleResult.pools_closed > 0) {
          parts.push(`Pools closed: ${settleResult.pools_closed}`)
        }
        settleNotes = parts.join('; ')
      } else {
        settleNotes = 'No tips to settle'
      }
    } catch {
      settleNotes = 'Failed to auto-settle tips'
    }
  }

  const combinedNotes = [notes, settleNotes].filter(Boolean).join(' | ')

  // Create approval record
  const { error: approvalError } = await supabase
    .from('eod_approvals')
    .insert({
      eod_closing_id,
      approved_by: profileId,
      status,
      notes: combinedNotes || null,
    })

  if (approvalError) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Failed to record approval' } }, { status: 500 })
  }

  // Update the closing record
  const updateStatus = status === 'approved' ? 'approved' : 'closed'

  const { error: updateError } = await supabase
    .from('eod_closings')
    .update({
      status: updateStatus,
      approved_by: profileId,
    })
    .eq('id', eod_closing_id)

  if (updateError) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Failed to update EOD status' } }, { status: 500 })
  }

  const { data: updated } = await supabase
    .from('eod_closings')
    .select('*, eod_closing_items(*), eod_approvals(*)')
    .eq('id', eod_closing_id)
    .single()

  return NextResponse.json({ data: updated }, { status: 200 })
}
