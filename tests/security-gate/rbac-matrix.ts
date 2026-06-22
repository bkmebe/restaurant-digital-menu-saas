// ============================================================
// RBAC ENFORCEMENT MATRIX — CI/CD Security Gate
// Tests all 30+ (role, resource, method) pairs.
// Exit code 0 = pass, 1 = fail (blocks deployment)
// ============================================================

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!
const STAGING_URL = process.env.STAGING_URL!

interface RoleDefinition {
  email: string
  password: string
  role: string
  restaurant_id: string
}

const ROLES: RoleDefinition[] = [
  { email: 'admin-a@test.com',    password: 'TestPass123!', role: 'admin',   restaurant_id: 'rest-a' },
  { email: 'mgr-a@test.com',      password: 'TestPass123!', role: 'manager', restaurant_id: 'rest-a' },
  { email: 'cashier-a@test.com',  password: 'TestPass123!', role: 'cashier', restaurant_id: 'rest-a' },
  { email: 'waiter-a1@test.com',  password: 'TestPass123!', role: 'waiter',  restaurant_id: 'rest-a' },
  { email: 'chef-a@test.com',     password: 'TestPass123!', role: 'chef',    restaurant_id: 'rest-a' },
]

// Resource → methods → roles allowed
const RBAC_MATRIX: Record<string, Record<string, string[]>> = {
  '/api/menu/items': {
    'GET':    ['admin', 'manager', 'cashier', 'waiter', 'chef'],
    'POST':   ['admin'],
    'PUT':    ['admin'],
    'DELETE': ['admin'],
  },
  '/api/orders': {
    'GET':    ['admin', 'manager', 'cashier', 'waiter', 'chef'],
    'POST':   ['admin', 'manager', 'cashier', 'waiter'],
    'PUT':    ['admin', 'manager', 'cashier', 'waiter'],
  },
  '/api/employees': {
    'GET':    ['admin', 'manager'],
    'POST':   ['admin'],
    'PUT':    ['admin'],
    'DELETE': ['admin'],
  },
  '/api/payroll': {
    'GET':    ['admin', 'manager'],
    'POST':   ['admin'],
    'PUT':    ['admin'],
  },
  '/api/admin/audit-logs': {
    'GET': ['admin'],
  },
  '/api/manager/reports': {
    'GET': ['admin', 'manager'],
  },
  '/api/branches': {
    'GET':    ['admin', 'manager'],
    'POST':   ['admin'],
    'PUT':    ['admin'],
  },
  '/api/subscriptions': {
    'GET':    ['admin'],
    'POST':   ['admin'],
    'PUT':    ['admin'],
  },
  '/api/restaurant/settings': {
    'GET':  ['admin'],
    'PUT':  ['admin'],
  },
}

interface RBACResult {
  role: string
  resource: string
  method: string
  expected: 'allow' | 'deny'
  actual: number
  passed: boolean
}

async function testRBACPair(
  roleDef: RoleDefinition,
  resource: string,
  method: string,
  allowedRoles: string[]
): Promise<RBACResult> {
  const isAllowed = allowedRoles.includes(roleDef.role)
  const expected = isAllowed ? 'allow' : 'deny'

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: { session } } = await supabase.auth.signInWithPassword({
    email: roleDef.email,
    password: roleDef.password,
  })

  const token = session?.access_token
  if (!token) return { role: roleDef.role, resource, method, expected, actual: 401, passed: false }

  const response = await fetch(`${STAGING_URL}${resource}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  const passed = isAllowed
    ? response.status < 400
    : response.status >= 400

  return {
    role: roleDef.role,
    resource,
    method,
    expected,
    actual: response.status,
    passed,
  }
}

async function main() {
  console.log('🛡️ RBAC Enforcement Matrix')
  console.log('===========================')
  
  let failures = 0
  let total = 0
  const results: RBACResult[] = []

  for (const [resource, methods] of Object.entries(RBAC_MATRIX)) {
    for (const [method, allowedRoles] of Object.entries(methods)) {
      for (const roleDef of ROLES) {
        total++
        const result = await testRBACPair(roleDef, resource, method, allowedRoles)
        results.push(result)

        const icon = result.passed ? '✅' : '❌'
        const expectedLabel = result.expected === 'allow' ? 'ALLOW' : 'DENY'
        console.log(`${icon} ${roleDef.role} → ${method} ${resource}: expected=${expectedLabel}, actual=${result.actual}`)

        if (!result.passed) {
          failures++
          console.error(`  FAIL: ${roleDef.role} ${method} ${resource} — expected ${expectedLabel}, got ${result.actual}`)
        }
      }
    }
  }

  console.log(`::set-output name=total::${total}`)
  console.log(`::set-output name=failures::${failures}`)
  console.log(`::set-output name=result::${JSON.stringify(results)}`)

  if (failures > 0) {
    console.error(`❌ FAILED: ${failures}/${total} RBAC pairs violated`)
    process.exit(1)
  }

  console.log(`✅ PASSED: All ${total} RBAC pairs correctly enforced`)
}

main().catch((err) => { console.error(err); process.exit(1) })
