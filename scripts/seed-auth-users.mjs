#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
try {
  const envPath = join(__dirname, '..', '.env.local')
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim()
    if (t && !t.startsWith('#')) {
      const eq = t.indexOf('=')
      if (eq > 0) { const k = t.slice(0, eq).trim(), v = t.slice(eq + 1).trim(); if (!process.env[k]) process.env[k] = v }
    }
  }
} catch {}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const TS = Date.now().toString(36)
const DEFAULT_PASSWORD = 'Habesha@2026!'

const accounts = [
  { email: 'owner@habesha.com',     role: 'admin',          employee_full_name: 'Biruk Fikadu' },
  { email: 'admin@habesha.com',     role: 'admin',          employee_full_name: 'Abel Tesfaye' },
  { email: 'manager@habesha.com',   role: 'manager',        employee_full_name: 'Selamawit Desta' },
  { email: 'cashier1@habesha.com',  role: 'cashier',        employee_full_name: 'Tigist Wondimu' },
  { email: 'waiter1@habesha.com',   role: 'waiter',         employee_full_name: 'Kebede Lemma' },
  { email: 'kitchen1@habesha.com',  role: 'kitchen_staff',  employee_full_name: 'Biniyam Abebe' },
  { email: 'inventory1@habesha.com',role: 'inventory_manager', employee_full_name: 'Mekdes Abera' },
]

async function main() {
  // First find the restaurant
  const { data: rest, error: restErr } = await supabase
    .from('restaurants')
    .select('id, name')
    .ilike('name', 'Habesha%')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (restErr || !rest) {
    console.error('Could not find Habesha restaurant:', restErr?.message)
    console.log('Will create auth users without employee linkage')
  } else {
    console.log('Found restaurant:', rest.name, rest.id)
  }

  // Find existing auth users to avoid duplicates
  const { data: existing } = await supabase.auth.admin.listUsers()
  const existingEmails = new Set((existing?.users || []).map(u => u.email))

  console.log('\nExisting auth users:', existing?.users?.length || 0)
  console.log('Already have emails:', [...existingEmails].join(', '))

  const created = []
  const skipped = []

  for (const acc of accounts) {
    if (existingEmails.has(acc.email)) {
      skipped.push(acc.email)
      console.log(`  SKIP ${acc.email} (already exists)`)
      continue
    }

    // Find the employee by full_name
    let employeeId = null
    if (rest) {
      const { data: emp } = await supabase
        .from('employees')
        .select('id, full_name')
        .eq('restaurant_id', rest.id)
        .eq('full_name', acc.employee_full_name)
        .single()
      if (emp) employeeId = emp.id
    }

    // Create auth user
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email: acc.email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: acc.employee_full_name,
        role: acc.role,
        employee_id: employeeId,
        restaurant_id: rest?.id || null,
        created_by: 'production-seed-' + TS
      }
    })

    if (createErr) {
      console.error(`  FAIL ${acc.email}: ${createErr.message}`)
      continue
    }

    created.push({ email: acc.email, id: newUser.user.id, employeeId })
    console.log(`  CREATED ${acc.email} (${acc.role}) -> id=${newUser.user.id} ${employeeId ? 'linked to employee' : 'no employee link'}`)
  }

  console.log('\n=== SUMMARY ===')
  console.log('Created:', created.length)
  console.log('Skipped:', skipped.length)
  if (created.length) {
    console.log('\nNew accounts:')
    for (const c of created) {
      console.log(`  ${c.email} / ${DEFAULT_PASSWORD}`)
    }
  }

  // Now try to login as each new user to verify
  if (created.length) {
    console.log('\n=== VERIFYING LOGIN ===')
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    for (const c of created) {
      const { data, error } = await client.auth.signInWithPassword({
        email: c.email,
        password: DEFAULT_PASSWORD
      })
      if (error) {
        console.log(`  FAIL ${c.email}: ${error.message}`)
      } else {
        console.log(`  OK ${c.email}: session token obtained`)
        await client.auth.signOut()
      }
    }
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1) })
