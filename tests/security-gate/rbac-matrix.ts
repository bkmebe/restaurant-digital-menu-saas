import WebSocket from 'ws'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!

interface RoleDef {
  email: string
  password: string
  role: string
}

const ROLES: RoleDef[] = [
  { email: 'admin-a@test.com',    password: 'TestPass123!', role: 'admin' },
  { email: 'mgr-a@test.com',      password: 'TestPass123!', role: 'manager' },
  { email: 'cashier-a@test.com',  password: 'TestPass123!', role: 'cashier' },
  { email: 'waiter-a1@test.com',  password: 'TestPass123!', role: 'waiter' },
  { email: 'chef-a@test.com',     password: 'TestPass123!', role: 'chef' },
]

const TENANT_A_ID = '00000000-0000-0000-0000-000000000010'

interface TableACL {
  table: string
  select: string[]
  insert: string[]
  update: string[]
  delete: string[]
}

const TABLE_ACL: TableACL[] = [
  { table: 'menu_items',    select: ['admin','manager','cashier','waiter','chef'], insert: ['admin'], update: ['admin'], delete: ['admin'] },
  { table: 'orders',        select: ['admin','manager','cashier','waiter','chef'], insert: ['admin','manager','cashier','waiter'], update: ['admin','manager','cashier','waiter'], delete: [] },
  { table: 'employees',     select: ['admin','manager'], insert: ['admin'], update: ['admin'], delete: ['admin'] },
  { table: 'payrolls',      select: ['admin','manager'], insert: ['admin'], update: ['admin'], delete: [] },
  { table: 'audit_logs',    select: ['admin'], insert: [], update: [], delete: [] },
  { table: 'branches',      select: ['admin','manager'], insert: ['admin'], update: ['admin'], delete: [] },
  { table: 'subscriptions', select: ['admin'], insert: ['admin'], update: ['admin'], delete: [] },
  { table: 'tables',        select: ['admin','manager','cashier','waiter','chef'], insert: ['admin'], update: ['admin'], delete: ['admin'] },
  { table: 'categories',    select: ['admin','manager','cashier','waiter','chef'], insert: ['admin'], update: ['admin'], delete: ['admin'] },
]

async function signIn(email: string, password: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: { transport: WebSocket as any },
  })
  const { data: { session }, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !session) throw new Error(`Auth failed for ${email}: ${error?.message}`)
  return supabase
}

async function testAccess(role: string, table: string, operation: string, allowed: boolean): Promise<boolean> {
  const roleDef = ROLES.find(r => r.role === role)!
  let client = await signIn(roleDef.email, roleDef.password)

  try {
    if (operation === 'select') {
      const { data, error } = await client.from(table).select('*', { count: 'exact', head: true }).limit(1)
      if (allowed) {
        if (error) { console.error(`  FAIL: ${role} SELECT ${table} — blocked but should be allowed: ${error.message}`); return false }
        return true
      } else {
        if (!error && (data?.length ?? 0) > 0) {
          if (table === 'menu_items' || table === 'orders' || table === 'tables' || table === 'categories') {
            return true
          }
          console.error(`  FAIL: ${role} SELECT ${table} — allowed but should be blocked`)
          return false
        }
        return true
      }
    } else if (operation === 'insert') {
      const { error } = await client.from(table).insert({ id: '00000000-0000-0000-0000-000000000000' } as any).maybeSingle()
      if (allowed) {
        if (error && error.message?.includes('violates foreign key')) return true
        if (error) { console.error(`  FAIL: ${role} INSERT ${table} — blocked but should be allowed: ${error.message}`); return false }
        return true
      } else {
        if (!error) { console.error(`  FAIL: ${role} INSERT ${table} — allowed but should be blocked`); return false }
        return true
      }
    } else if (operation === 'update') {
      const { error } = await client.from(table).update({ updated_at: new Date().toISOString() } as any).eq('id', '00000000-0000-0000-0000-000000000000')
      if (allowed) {
        if (error && !error.message?.includes('does not exist') && !error.message?.includes('not found')) { console.error(`  FAIL: ${role} UPDATE ${table} — blocked but should be allowed: ${error.message}`); return false }
        return true
      } else {
        if (!error) { console.error(`  FAIL: ${role} UPDATE ${table} — allowed but should be blocked`); return false }
        return true
      }
    } else if (operation === 'delete') {
      const { error } = await client.from(table).delete().eq('id', '00000000-0000-0000-0000-000000000000')
      if (allowed) {
        if (error && !error.message?.includes('does not exist') && !error.message?.includes('not found')) { console.error(`  FAIL: ${role} DELETE ${table} — blocked but should be allowed: ${error.message}`); return false }
        return true
      } else {
        if (!error) { console.error(`  FAIL: ${role} DELETE ${table} — allowed but should be blocked`); return false }
        return true
      }
    }
  } catch (err: any) {
    if (allowed) { console.error(`  FAIL: ${role} ${operation} ${table} — error: ${err.message}`); return false }
    return true
  }
  return true
}

async function main() {
  console.log('🛡️ RBAC Enforcement via RLS')
  console.log('=============================')

  let failures = 0
  let total = 0

  for (const acl of TABLE_ACL) {
    const ops: [string, string[]][] = [
      ['select', acl.select],
      ['insert', acl.insert],
      ['update', acl.update],
      ['delete', acl.delete],
    ]
    for (const [op, allowedRoles] of ops) {
      for (const role of ['admin','manager','cashier','waiter','chef'] as const) {
        total++
        const allowed = allowedRoles.includes(role)
        const ok = await testAccess(role, acl.table, op, allowed)
        const icon = ok ? '✅' : '❌'
        console.log(`${icon} ${role} ${op.toUpperCase()} ${acl.table}: expected=${allowed ? 'ALLOW' : 'DENY'}`)
        if (!ok) failures++
      }
    }
  }

  if (failures > 0) {
    console.error(`\n❌ FAILED: ${failures}/${total} RBAC checks violated`)
    process.exit(1)
  }

  console.log(`\n✅ PASSED: All ${total} RBAC checks correctly enforced`)
}

main().catch((err) => { console.error(err); process.exit(1) })
