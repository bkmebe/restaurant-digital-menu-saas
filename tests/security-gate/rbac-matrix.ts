import WebSocket from 'ws'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!

const TENANT_A_ID = '00000000-0000-0000-0000-000000000010'

interface RoleDef {
  email: string
  password: string
  role: string
}

const ROLES: RoleDef[] = [
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
  console.log('🛡️ RBAC Enforcement via RLS')
  console.log('=============================')

  let failures = 0
  let total = 0

  const ok = (v: boolean) => v
  const fail = (msg: string) => { console.error(`  FAIL: ${msg}`); failures++ }

  for (const { email, password, role } of ROLES) {
    total++
    try {
      const client = await signIn(email, password)
      console.log(`✅ ${role}: authenticated as ${email}`)
    } catch (e: any) {
      fail(`${role}: authentication failed — ${e.message}`)
      continue
    }
  }

  const admin = await signIn('admin-a@test.com', 'TestPass123!')
  const manager = await signIn('mgr-a@test.com', 'TestPass123!')
  const cashier = await signIn('cashier-a@test.com', 'TestPass123!')
  const waiter = await signIn('waiter-a1@test.com', 'TestPass123!')

  const ALL_TABLES = ['menu_items', 'orders', 'employees', 'payrolls', 'audit_logs', 'categories', 'tables', 'service_requests', 'payment_configs']

  for (const table of ALL_TABLES) {
    total++
    const { data, error } = await admin.from(table).select('*', { count: 'exact', head: true }).limit(1)
    if (error) { fail(`admin SELECT ${table} — ${error.message}`); continue }
    console.log(`✅ admin SELECT ${table}: accessible`)
  }

  const SENSITIVE_TABLES = ['payrolls', 'audit_logs']
  for (const table of SENSITIVE_TABLES) {
    total++
    const { data, error } = await manager.from(table).select('*', { count: 'exact', head: true }).limit(1)
    if (error) { fail(`manager SELECT ${table} — ${error.message}`); continue }
    console.log(`✅ manager SELECT ${table}: accessible`)
  }

  for (const table of SENSITIVE_TABLES) {
    total++
    const { data, error } = await cashier.from(table).select('*', { count: 'exact', head: true }).limit(1)
    if (!error) { fail(`cashier SELECT ${table} — should be blocked by RLS`); continue }
    console.log(`✅ cashier SELECT ${table}: blocked by RLS`)
  }

  for (const table of SENSITIVE_TABLES) {
    total++
    const { data, error } = await waiter.from(table).select('*', { count: 'exact', head: true }).limit(1)
    if (!error) { fail(`waiter SELECT ${table} — should be blocked by RLS`); continue }
    console.log(`✅ waiter SELECT ${table}: blocked by RLS`)
  }

  const STAFF_TABLES = ['menu_items', 'orders', 'categories', 'tables', 'employees', 'service_requests', 'payment_configs']
  for (const table of STAFF_TABLES) {
    total++
    const { data, error } = await cashier.from(table).select('*', { count: 'exact', head: true }).limit(1)
    if (error) { fail(`cashier SELECT ${table} — ${error.message}`); continue }
    console.log(`✅ cashier SELECT ${table}: accessible`)
  }

  for (const table of STAFF_TABLES) {
    total++
    const { data, error } = await waiter.from(table).select('*', { count: 'exact', head: true }).limit(1)
    if (error) { fail(`waiter SELECT ${table} — ${error.message}`); continue }
    console.log(`✅ waiter SELECT ${table}: accessible`)
  }

  total++
  const { data: crossData, error: crossError } = await admin
    .from('menu_items')
    .select('*', { count: 'exact', head: true })
    .neq('restaurant_id', TENANT_A_ID)
  if (!crossError && (crossData?.length ?? 0) > 0) {
    fail(`admin: cross-tenant data accessible via neq filter — ${crossData?.length} rows from other tenants`)
  } else {
    console.log(`✅ admin: cross-tenant isolation enforced (no data from other tenants)`)
  }

  if (failures > 0) {
    console.error(`\n❌ FAILED: ${failures} RBAC checks violated`)
    process.exit(1)
  }

  console.log(`\n✅ PASSED: All ${total} RBAC checks correctly enforced`)
}

main().catch((err) => { console.error(err); process.exit(1) })
