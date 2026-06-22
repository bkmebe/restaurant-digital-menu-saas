import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const body = await request.json()

  const { table_id, type, notes } = body
  if (!table_id || !type) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'table_id and type are required' } }, { status: 400 })
  }

  // Get the table's restaurant_id
  const { data: table } = await supabase.from('tables').select('restaurant_id').eq('id', table_id).single()
  if (!table) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Table not found' } }, { status: 404 })
  }

  const { data, error } = await supabase.from('service_requests').insert({
    restaurant_id: table.restaurant_id,
    table_id,
    type,
    notes,
  }).select().single()

  if (error) return NextResponse.json({ error: { code: 'CREATE_ERROR', message: error.message } }, { status: 400 })
  return NextResponse.json({ data, message: 'Request sent' }, { status: 201 })
}
