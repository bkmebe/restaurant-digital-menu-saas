// ============================================================
// PHASE 5: STRESS / LOAD TESTS — k6
// Target: Staging environment
// Install: npm install -g k6  (or download from k6.io)
// Run: k6 run tests/manual/k6-stress-test.js
// ============================================================

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

// ---- Configuration ----
const STAGING_URL = __ENV.STAGING_URL || 'http://localhost:3000'
const ADMIN_TOKEN = __ENV.ADMIN_TOKEN || ''
const RESTAURANT_ID = '00000000-0000-0000-0000-000000000010'

const authHeaders = {
  'Authorization': `Bearer ${ADMIN_TOKEN}`,
  'Content-Type': 'application/json',
}

// ---- Custom Metrics ----
const errorRate = new Rate('errors')
const orderCreationTime = new Trend('order_creation_ms')
const menuLoadTime = new Trend('menu_load_ms')
const auditQueryTime = new Trend('audit_query_ms')
const loginFailureRate = new Rate('login_errors')

// ---- Stages ----
export const options = {
  stages: [
    { duration: '2m', target: 20 },   // Ramp up to 20 users
    { duration: '5m', target: 50 },   // Ramp to 50
    { duration: '3m', target: 100 },  // Peak: 100 concurrent
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],  // 95% of requests under 3s
    errors: ['rate<0.05'],              // Error rate < 5%
    http_req_failed: ['rate<0.02'],     // HTTP errors < 2%
  },
  // 10 virtual users for the smoke test below
}

// ---- Helper: Random ID ----
function randomUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

// ============================================================
// SMOKE TEST — single user, validate endpoints
// ============================================================
export function smoke() {
  group('Smoke Test — Critical Paths', () => {
    // 1. Menu load
    let res = http.get(`${STAGING_URL}/api/menu/items?restaurantId=${RESTAURANT_ID}`, { headers: authHeaders })
    check(res, { 'menu endpoint returns 200': r => r.status === 200 })
    menuLoadTime.add(res.timings.duration)

    // 2. Orders list
    res = http.get(`${STAGING_URL}/api/orders?restaurantId=${RESTAURANT_ID}`, { headers: authHeaders })
    check(res, { 'orders endpoint returns 200': r => r.status === 200 })

    // 3. Create order
    const orderPayload = JSON.stringify({
      restaurant_id: RESTAURANT_ID,
      table_id: 't0000001-0000-0000-0000-000000000001',
      customer_name: 'Smoke Test',
      status: 'pending',
      items: [
        { menu_item_id: 'i0000001-0000-0000-0000-000000000001', quantity: 2, unit_price: 450, subtotal: 900 },
        { menu_item_id: 'i0000001-0000-0000-0000-000000000002', quantity: 1, unit_price: 350, subtotal: 350 },
      ],
      total_amount: 1250,
    })
    res = http.post(`${STAGING_URL}/api/orders`, orderPayload, { headers: authHeaders })
    check(res, { 'create order returns 201': r => r.status === 201 })
    orderCreationTime.add(res.timings.duration)

    // 4. Audit logs
    res = http.get(`${STAGING_URL}/api/admin/audit-logs?restaurantId=${RESTAURANT_ID}`, { headers: authHeaders })
    check(res, { 'audit logs returns 200': r => r.status === 200 })
    auditQueryTime.add(res.timings.duration)

    // 5. Manager reports
    res = http.get(`${STAGING_URL}/api/manager/reports?restaurantId=${RESTAURANT_ID}&period=7`, { headers: authHeaders })
    check(res, { 'reports endpoint returns 200': r => r.status === 200 })
  })
}

// ============================================================
// LOAD TEST — main scenario
// ============================================================
export default function load() {
  group('Restaurant API Load', () => {

    // ---- Scenario A: Browse Menu (read-heavy, 40% of traffic) ----
    group('Menu Browsing', () => {
      const res = http.get(`${STAGING_URL}/api/menu/items?restaurantId=${RESTAURANT_ID}`, { headers: authHeaders })
      check(res, { 'menu OK': r => r.status === 200 })
      menuLoadTime.add(res.timings.duration)
      errorRate.add(res.status !== 200)
      sleep(Math.random() * 3 + 1)
    })

    // ---- Scenario B: Create Order (write-heavy, 25% of traffic) ----
    group('Order Creation', () => {
      const payload = JSON.stringify({
        restaurant_id: RESTAURANT_ID,
        table_id: 't0000001-0000-0000-0000-000000000001',
        customer_name: `Load User ${Math.floor(Math.random() * 1000)}`,
        status: 'pending',
        items: [
          { menu_item_id: 'i0000001-0000-0000-0000-000000000003', quantity: 1, unit_price: 220, subtotal: 220 },
          { menu_item_id: 'i0000001-0000-0000-0000-000000000004', quantity: 3, unit_price: 180, subtotal: 540 },
        ],
        total_amount: 760,
      })
      const res = http.post(`${STAGING_URL}/api/orders`, payload, { headers: authHeaders })
      check(res, { 'order created': r => r.status === 201 })
      orderCreationTime.add(res.timings.duration)
      errorRate.add(res.status !== 201)
      sleep(Math.random() * 2 + 0.5)
    })

    // ---- Scenario C: Dashboard Reports (heavy query, 20% of traffic) ----
    group('Reports', () => {
      const res = http.get(`${STAGING_URL}/api/manager/reports?restaurantId=${RESTAURANT_ID}&period=30`, { headers: authHeaders })
      check(res, { 'reports OK': r => r.status === 200 })
      auditQueryTime.add(res.timings.duration)
      errorRate.add(res.status !== 200)
      sleep(Math.random() * 5 + 2)
    })

    // ---- Scenario D: Audit Logs (admin, 15% of traffic) ----
    group('Audit Logs', () => {
      // Page through multiple pages
      for (let page = 1; page <= 3; page++) {
        const res = http.get(`${STAGING_URL}/api/admin/audit-logs?restaurantId=${RESTAURANT_ID}&page=${page}&limit=50`, { headers: authHeaders })
        check(res, { 'audit OK': r => r.status === 200 })
        errorRate.add(res.status !== 200)
        sleep(0.3)
      }
    })
  })
}

// ============================================================
// STRESS TEST — max concurrency for 1 minute
// ============================================================
export const stress_options = {
  stages: [
    { duration: '30s', target: 200 },
    { duration: '1m', target: 200 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    errors: ['rate<0.10'],
  },
}

export function stress() {
  group('Stress — Create Orders', () => {
    http.batch([
      ['POST', `${STAGING_URL}/api/orders`, JSON.stringify({
        restaurant_id: RESTAURANT_ID,
        table_id: 't0000001-0000-0000-0000-000000000001',
        customer_name: `Stress ${__VU}-${__ITER}`,
        status: 'pending',
        items: [
          { menu_item_id: 'i0000001-0000-0000-0000-000000000005', quantity: 1, unit_price: 150, subtotal: 150 },
        ],
        total_amount: 150,
      }), { headers: authHeaders }],
      ['GET', `${STAGING_URL}/api/menu/items?restaurantId=${RESTAURANT_ID}`, null, { headers: authHeaders }],
      ['GET', `${STAGING_URL}/api/orders?restaurantId=${RESTAURANT_ID}`, null, { headers: authHeaders }],
    ])
  })
}
