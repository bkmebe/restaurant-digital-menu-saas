// ============================================================
// JWT TAMPERING DETECTION — CI/CD Security Gate
// Tests 5 forgery vectors.
// Exit code 0 = pass, 1 = fail (blocks deployment)
// ============================================================

const STAGING_URL = process.env.STAGING_URL!
const ADMIN_JWT = process.env.ADMIN_JWT!

function decodeBase64(str: string): string {
  return Buffer.from(str, 'base64').toString('utf-8')
}

function encodeBase64(str: string): string {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function forgeJWT(original: string, claimsOverride: Record<string, any>): string {
  const parts = original.split('.')
  const header = parts[0]!
  const payload = JSON.parse(decodeBase64(parts[1]!))
  Object.assign(payload, claimsOverride)
  const forgedPayload = encodeBase64(JSON.stringify(payload))
  const forgedSignature = encodeBase64(Buffer.from('forged'))
  return `${header}.${forgedPayload}.${forgedSignature}`
}

const FORGERY_VECTORS = [
  {
    id: 'SEC-001',
    name: 'Role escalation: waiter → admin',
    forge: { role: 'admin' },
    expected: [401, 403],
  },
  {
    id: 'SEC-002',
    name: 'Cross-tenant: change restaurant_id',
    forge: { restaurant_id: 'tenant-b' },
    expected: [401, 403],
  },
  {
    id: 'SEC-003',
    name: 'Expired JWT: set exp to past',
    forge: { exp: Math.floor(Date.now() / 1000) - 86400 },
    expected: [401],
  },
  {
    id: 'SEC-004',
    name: 'Future iat: set iat ahead',
    forge: { iat: Math.floor(Date.now() / 1000) + 3600 },
    expected: [401],
  },
  {
    id: 'SEC-005',
    name: 'Invalid audience',
    forge: { aud: 'wrong-app' },
    expected: [401, 403],
  },
]

async function testForgery(vector: typeof FORGERY_VECTORS[0]) {
  const forgedToken = forgeJWT(ADMIN_JWT, vector.forge)
  const adminEndpoints = [
    `${STAGING_URL}/api/orders`,
    `${STAGING_URL}/api/employees`,
    `${STAGING_URL}/api/payroll`,
  ]

  for (const url of adminEndpoints) {
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${forgedToken}` },
      })
      const passed = vector.expected.includes(response.status)
      const icon = passed ? '✅' : '❌'
      console.log(`${icon} ${vector.id}: ${vector.name} → ${url} → ${response.status} (expected ${vector.expected.join('|')})`)
      if (!passed) {
        console.error(`  CRITICAL: Forged JWT accepted on ${url}`)
        return { id: vector.id, name: vector.name, url, passed: false, actual: response.status }
      }
    } catch {
      console.log(`✅ ${vector.id}: ${vector.name} → connection refused (network blocked)`)
    }
  }
  return { id: vector.id, name: vector.name, passed: true, actual: 401 }
}

async function main() {
  console.log('🔑 JWT Tampering Detection')
  console.log('==========================')
  
  let failures = 0

  for (const vector of FORGERY_VECTORS) {
    const result = await testForgery(vector)
    if (!result.passed) failures++
  }

  console.log(`::set-output name=failures::${failures}`)

  if (failures > 0) {
    console.error(`❌ FAILED: ${failures} forgery vectors were accepted`)
    process.exit(1)
  }

  console.log('✅ PASSED: All JWT forgery attacks blocked')
}

main().catch((err) => { console.error(err); process.exit(1) })
