import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole, requireMutate } from '@/lib/utils/tenant'

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
  const { eod_closing_id, reason } = body as {
    eod_closing_id: string
    reason?: string
  }

  if (!eod_closing_id) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'eod_closing_id is required' } }, { status: 400 })
  }

  const { data: closing, error: closingError } = await supabase
    .from('eod_closings')
    .select('*')
    .eq('id', eod_closing_id)
    .single()

  if (closingError || !closing) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'EOD closing not found' } }, { status: 404 })
  }

  if (closing.status !== 'closed' && closing.status !== 'approved') {
    return NextResponse.json({ error: { code: 'INVALID_STATUS', message: `Cannot reopen EOD with status: ${closing.status}` } }, { status: 409 })
  }

  // Record the action in approvals
  await supabase.from('eod_approvals').insert({
    eod_closing_id,
    approved_by: profileId,
    status: 'approved',
    notes: `Reopened: ${reason || 'No reason provided'}`,
  })

  const { error: updateError } = await supabase
    .from('eod_closings')
    .update({
      status: 'reopened',
      closed_at: null,
      closed_by: null,
      approved_by: null,
      notes: reason || null,
    })
    .eq('id', eod_closing_id)

  if (updateError) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Failed to reopen EOD' } }, { status: 500 })
  }

  const { data: updated } = await supabase
    .from('eod_closings')
    .select('*, eod_closing_items(*), eod_approvals(*)')
    .eq('id', eod_closing_id)
    .single()

  return NextResponse.json({ data: updated }, { status: 200 })
}
