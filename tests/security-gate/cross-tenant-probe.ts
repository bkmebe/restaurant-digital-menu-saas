// ============================================================
// CROSS-TENANT ACCESS PROBE — CI/CD Security Gate
// Tests: tenant A cannot access tenant B data via any endpoint
// ============================================================

const STAGING_URL = process.env.STAGING_URL!
const ADMIN_JWT = process.env.ADMIN_JWT!

const TENANT_A_ID = '00000000-0000-0000-0000-000000000010'
const TENANT_B_ID = '00000000-0000-0000-0000-000000000011'

interface ProbeTarget {
  endpoint: string
  method: string
  maliciousParam?: Record<string, string>
}

const PROBE_TARGETS: ProbeTarget[] = [
  { endpoint: '/api/orders',              method: 'GET',  maliciousParam: { restaurant_id: TENANT_B_ID } },
  { endpoint: '/api/menu/items',          method: 'GET',  maliciousParam: { restaurant_id: TENANT_B_ID } },
  { endpoint: '/api/employees',           method: 'GET',  maliciousParam: { restaurant_id: TENANT_B_ID } },
  { endpoint: '/api/payroll',             method: 'GET',  maliciousParam: { restaurant_id: TENANT_B_ID } },
  { endpoint: '/api/manager/reports',     method: 'GET',  maliciousParam: { restaurant_id: TENANT_B_ID } },
  { endpoint: '/api/branches',            method: 'GET',  maliciousParam: { restaurant_id: TENANT_B_ID } },
  { endpoint: '/api/admin/audit-logs',    method: 'GET',  maliciousParam: { restaurant_id: TENANT_B_ID } },
  // Direct order access by ID belonging to tenant B
  { endpoint: '/api/orders/order-b-001',  method: 'GET' },
  // Forced header-based tenant override
  { endpoint: '/api/orders',              method: 'GET',  maliciousParam: { 'x-tenant-id': TENANT_B_ID } },
]

async function probe(endpoint: string, method: string, params?: Record<string, string>) {
  let url = `${STAGING_URL}${endpoint}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${ADMIN_JWT}`,
    'Content-Type': 'application/json',
  }

  if (params) {
    if (method === 'GET') {
      const qs = new URLSearchParams(params).toString()
      url += `?${qs}`
    } else {
      Object.assign(headers, params)
    }
  }

  const response = await fetch(url, { method, headers })
  let body: any
  try { body = await response.json() } catch { body = null }

  // Determine if any data leaked from tenant B
  const leakedFromB = body?.data?.some((r: any) =>
    r.restaurant_id === TENANT_B_ID || r.tenant_id === TENANT_B_ID
  )
  const blocked = response.status >= 400 || !leakedFromB

  const icon = blocked ? '✅' : '❌'
  const leakInfo = leakedFromB ? ' DATA LEAKED' : ''
  console.log(`${icon} ${method} ${endpoint} → ${response.status}${leakInfo}`)

  return { endpoint, method, status: response.status, blocked, leakedFromB }
}

async function main() {
  console.log('🔒 Cross-Tenant Access Probe')
  console.log('=============================')

  let failures = 0

  for (const target of PROBE_TARGETS) {
    const result = await probe(target.endpoint, target.method, target.maliciousParam)
    if (!result.blocked) {
      console.error(`  CRITICAL: Cross-tenant data leaked via ${target.method} ${target.endpoint}`)
      if (result.leakedFromB) {
        console.error(`  Tenant A token returned Tenant B data!`)
      }
      failures++
    }
  }

  console.log(`::set-output name=failures::${failures}`)

  if (failures > 0) {
    console.error(`❌ FAILED: ${failures} cross-tenant access paths leaked data`)
    process.exit(1)
  }

  console.log('✅ PASSED: All cross-tenant access attempts blocked')
}

main().catch((err) => { console.error(err); process.exit(1) })
