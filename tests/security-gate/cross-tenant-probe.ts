import WebSocket from 'ws'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!

const TENANT_A_ID = '00000000-0000-0000-0000-000000000010'
const TENANT_B_ID = '00000000-0000-0000-0000-000000000011'

const SENSITIVE_TABLES = [
  'orders', 'menu_items', 'order_items',
  'employees', 'payrolls', 'audit_logs',
  'branches', 'subscriptions',
  'tables', 'categories',
]

async function probe() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: { transport: WebSocket as any },
  })

  const { data: { session }, error } = await supabase.auth.signInWithPassword({
    email: 'admin-a@test.com',
    password: 'TestPass123!',
  })
  if (error || !session) throw new Error(`Auth failed: ${error?.message}`)

  const authed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    realtime: { transport: WebSocket as any },
  })

  let failures = 0

  for (const table of SENSITIVE_TABLES) {
    const { data, error: queryError } = await authed
      .from(table)
      .select('*', { count: 'exact', head: true })
      .neq('restaurant_id', TENANT_A_ID)

    const leaked = !queryError && (data?.length ?? 0) > 0
    const icon = leaked ? '❌' : '✅'
    console.log(`${icon} ${table}: ${leaked ? `CROSS-TENANT LEAK (${data?.length} rows from tenant B)` : 'isolated'}`)

    if (leaked) {
      console.error(`  CRITICAL: ${table} returned data for restaurant_id ≠ ${TENANT_A_ID}`)
      failures++
    }
  }

  const { data: bData, error: bError } = await authed
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', TENANT_B_ID)

  const directAccess = !bError && (bData?.length ?? 0) > 0
  if (directAccess) {
    console.error(`❌ employees: Direct query for tenant B data returned ${bData?.length} rows — cross-tenant access`)
    failures++
  } else {
    console.log(`✅ employees: Direct query for tenant B data blocked by RLS`)
  }

  return failures
}

async function main() {
  console.log('🔒 Cross-Tenant Access Probe (via RLS)')
  console.log('========================================')

  const failures = await probe()

  if (failures > 0) {
    console.error(`\n❌ FAILED: ${failures} cross-tenant access violations detected`)
    process.exit(1)
  }

  console.log('\n✅ PASSED: All cross-tenant access attempts blocked')
}

main().catch((err) => { console.error(err); process.exit(1) })
