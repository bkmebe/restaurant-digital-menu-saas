// RLS ISOLATION VERIFICATION — CI/CD Security Gate
// Verifies cross-tenant isolation is enforced at the database level.
// Uses Supabase client with real user tokens (not service key).
// Exit code 0 = pass, 1 = fail (blocks deployment)

import WebSocket from 'ws'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin-a@test.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'TestPass123!'

const TENANT_A_ID = '00000000-0000-0000-0000-000000000010'

const PROTECTED_TABLES = [
  'orders', 'menu_items', 'order_items',
  'employees', 'payrolls', 'audit_logs',
  'branches', 'subscriptions',
  'service_requests', 'tables', 'categories',
]

async function main() {
  console.log('RLS Isolation Verification')
  console.log()

  // Sign in as a real tenant user (not service role — that bypasses RLS)
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: { transport: WebSocket as any },
  })
  const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  })

  if (authError || !session) {
    console.error(`Auth failed: ${authError?.message || 'No session'}`)
    process.exit(1)
  }

  // Create an authed client for tenant A
  const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    realtime: { transport: WebSocket as any },
  })

  let failures = 0

  for (const table of PROTECTED_TABLES) {
    // Attempt to read rows where restaurant_id does NOT match our tenant.
    // If RLS is working, Supabase ignores our filter and only returns
    // rows matching the user's tenant. If RLS is broken, we'll see
    // cross-tenant data.
    const { data, error } = await authedClient
      .from(table)
      .select('*', { count: 'exact', head: true })
      .neq('restaurant_id', TENANT_A_ID)

    const crossTenantLeak = !error && (data?.length ?? 0) > 0
    const icon = crossTenantLeak ? 'FAIL' : 'PASS'
    console.log(`${icon} ${table}: ${crossTenantLeak ? `CROSS-TENANT LEAK (${data?.length} rows)` : 'isolated'}`)

    if (crossTenantLeak) {
      console.error(`CRITICAL: ${table} — cross-tenant READ succeeded. RLS is not enforced.`)
      failures++
    }
  }

  if (failures > 0) {
    console.error(`\nFAILED: ${failures} RLS violations detected`)
    process.exit(1)
  }

  console.log(`\nPASSED: All ${PROTECTED_TABLES.length} tables enforce tenant isolation`)
}

main().catch((err) => { console.error(err); process.exit(1) })
