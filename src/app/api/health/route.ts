import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()

  const checks: Record<string, string> = {
    server: 'ok',
    database: 'ok',
    auth: 'ok',
    timestamp: new Date().toISOString(),
  }

  let allOk = true

  const { error: dbError } = await supabase.from('tables').select('id', { count: 'exact', head: true }).limit(1)
  if (dbError) {
    checks.database = 'error'
    allOk = false
  }

  const { error: authError } = await supabase.auth.getSession()
  if (authError) {
    checks.auth = 'error'
    allOk = false
  }

  return NextResponse.json({ status: checks }, { status: allOk ? 200 : 503 })
}
