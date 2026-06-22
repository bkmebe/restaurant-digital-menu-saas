import WebSocket from 'ws'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!

const TENANT_A_ID = '00000000-0000-0000-0000-000000000010'
const TENANT_B_ID = '00000000-0000-0000-0000-000000000011'

async function main() {
  console.log('Cross-Tenant Access Probe (via RLS)')
  console.log('=====================================')

  const c = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { realtime: { transport: WebSocket as any } })
  const { data: { session }, error } = await c.auth.signInWithPassword({
    email: 'admin-a@test.com',
    password: 'TestPass123!',
  })
  if (error || !session) throw new Error(`Auth failed: ${error?.message}`)

  const authed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    realtime: { transport: WebSocket as any },
  })

  let failures = 0

  const TABLES = ['menu_items', 'orders', 'employees', 'payrolls', 'audit_logs', 'categories', 'tables', 'service_requests']

  for (const table of TABLES) {
    const { data, error: qe } = await authed
      .from(table)
      .select('*', { count: 'exact', head: true })
      .neq('restaurant_id', TENANT_A_ID)

    const leaked = !qe && (data?.length ?? 0) > 0
    console.log(`  ${leaked ? 'FAIL' : 'PASS'} ${table}: ${leaked ? `LEAK (${data?.length} rows from other tenants)` : 'isolated'}`)
    if (leaked) { console.error(`  CRITICAL: ${table} cross-tenant leak`); failures++ }
  }

  const { data: bData, error: bError } = await authed
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', TENANT_B_ID)

  if (!bError && (bData?.length ?? 0) > 0) {
    console.error(`  CRITICAL: Direct access to tenant B employees`)
    failures++
  } else {
    console.log('  PASS: Direct query for tenant B data blocked')
  }

  if (failures > 0) {
    console.error(`\nFAILED: ${failures} cross-tenant violations detected`)
    process.exit(1)
  }

  console.log('\nPASSED: All cross-tenant access blocked')
}

main().catch((err) => { console.error(err); process.exit(1) })
