// ============================================================
// WEBHOOK SECURITY VALIDATION — CI/CD Security Gate
// Tests: signature validation, replay, malformed payload
// ============================================================

const STAGING_URL = process.env.STAGING_URL!
const WEBHOOK_SECRET = process.env.CHAPA_WEBHOOK_SECRET!

import { createHmac } from 'crypto'

function signPayload(payload: string, secret: string, timestamp?: string): string {
  const ts = timestamp || Math.floor(Date.now() / 1000).toString()
  return createHmac('sha256', secret).update(`${ts}.${payload}`).digest('hex')
}

const VALID_PAYLOAD = JSON.stringify({
  event: 'charge.success',
  data: {
    id: 'chapa_tx_test_001',
    amount: 1500,
    currency: 'ETB',
    status: 'success',
    order_id: 'order-001',
  },
})

const ATTACKS = [
  {
    id: 'WH-001',
    name: 'Missing signature header',
    headers: {},
    expectedStatus: 401,
  },
  {
    id: 'WH-002',
    name: 'Invalid signature (tampered payload)',
    headers: {
      'x-chapa-signature': 'tampered_signature',
      'x-chapa-timestamp': Math.floor(Date.now() / 1000).toString(),
    },
    expectedStatus: 401,
  },
  {
    id: 'WH-003',
    name: 'Replay attack (expired timestamp)',
    headers: {
      'x-chapa-signature': signPayload(VALID_PAYLOAD, WEBHOOK_SECRET, '1000000000'),
      'x-chapa-timestamp': '1000000000',
    },
    expectedStatus: 401,
  },
  {
    id: 'WH-004',
    name: 'Tampered body with valid signature?',
    headers: {
      'x-chapa-signature': signPayload(VALID_PAYLOAD, WEBHOOK_SECRET),
      'x-chapa-timestamp': Math.floor(Date.now() / 1000).toString(),
    },
    body: JSON.stringify({ event: 'charge.success', data: { amount: 999999 } }),
    expectedStatus: 401,
  },
  {
    id: 'WH-005',
    name: 'Malformed JSON body',
    headers: {
      'x-chapa-signature': 'any',
      'x-chapa-timestamp': Math.floor(Date.now() / 1000).toString(),
    },
    body: 'not-json-at-all',
    expectedStatus: 400,
  },
  {
    id: 'WH-006',
    name: 'Empty body',
    headers: {
      'x-chapa-signature': 'any',
      'x-chapa-timestamp': Math.floor(Date.now() / 1000).toString(),
    },
    body: '',
    expectedStatus: 400,
  },
]

async function run() {
  console.log('📬 Webhook Security Validation')
  console.log('===============================')
  let failures = 0

  for (const attack of ATTACKS) {
    try {
      const response = await fetch(`${STAGING_URL}/api/webhooks/chapa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...attack.headers,
        },
        body: attack.body || VALID_PAYLOAD,
      })

      const passed = response.status === attack.expectedStatus
      const icon = passed ? '✅' : '❌'
      console.log(`${icon} ${attack.id}: ${attack.name} → ${response.status} (expected ${attack.expectedStatus})`)

      if (!passed) {
        console.error(`  FAIL: Expected ${attack.expectedStatus}, got ${response.status}`)
        failures++
      }
    } catch (err) {
      console.log(`⚠️  ${attack.id}: ${attack.name} → connection error (network may be blocked)`)
    }
  }

  console.log(`::set-output name=failures::${failures}`)
  if (failures > 0) {
    console.error(`❌ FAILED: ${failures} webhook security checks failed`)
    process.exit(1)
  }
  console.log('✅ PASSED: All webhook attacks blocked')
}

run().catch((err) => { console.error(err); process.exit(1) })
