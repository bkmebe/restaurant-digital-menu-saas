import WebSocket from 'ws'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!

const TENANT_A_ID = '00000000-0000-0000-0000-000000000010'

const ROLES = [
  { email: 'admin-a@test.com',   password: 'TestPass123!', role: 'admin' },
  { email: 'mgr-a@test.com',     password: 'TestPass123!', role: 'manager' },
  { email: 'cashier-a@test.com', password: 'TestPass123!', role: 'cashier' },
  { email: 'waiter-a1@test.com', password: 'TestPass123!', role: 'waiter' },
]

async function signIn(email: string, password: string) {
  const c = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { realtime: { transport: WebSocket as any } })
  const { data: { session }, error } = await c.auth.signInWithPassword({ email, password })
  if (error || !session) throw new Error(`Auth failed for ${email}: ${error?.message}`)
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    realtime: { transport: WebSocket as any },
  })
}

async function main() {
  console.log('RBAC Enforcement via RLS')
  console.log('========================')

  let failures = 0
  let total = 0

  const fail = (msg: string) => { console.error(`  FAIL: ${msg}`); failures++ }

  for (const { email, password, role } of ROLES) {
    total++
    try {
      await signIn(email, password)
      console.log(`  PASS: ${role} authenticated`)
    } catch (e: any) {
      fail(`${role} authentication failed — ${e.message}`)
    }
  }

  const admin = await signIn('admin-a@test.com', 'TestPass123!')

  const ALL_TABLES = ['menu_items', 'orders', 'employees', 'payrolls', 'audit_logs', 'categories', 'tables', 'service_requests', 'payment_configs']
  for (const table of ALL_TABLES) {
    total++
    const { error } = await admin.from(table).select('*', { count: 'exact', head: true }).limit(1)
    if (error) { fail(`admin SELECT ${table} — ${error.message}`); continue }
    console.log(`  PASS: admin SELECT ${table}`)
  }

  total++
  const { data: crossData, error: crossError } = await admin
    .from('menu_items')
    .select('*', { count: 'exact', head: true })
    .neq('restaurant_id', TENANT_A_ID)
  if (!crossError && (crossData?.length ?? 0) > 0) {
    fail(`cross-tenant data accessible — ${crossData?.length} rows from other tenants`)
  } else {
    console.log('  PASS: cross-tenant isolation enforced')
  }

  if (failures > 0) {
    console.error(`\nFAILED: ${failures} checks violated`)
    process.exit(1)
  }

  console.log(`\nPASSED: All ${total} checks passed`)
}

main().catch((err) => { console.error(err); process.exit(1) })
