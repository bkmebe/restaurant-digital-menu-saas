#!/usr/bin/env node

/**
 * Restaurant Digital Menu — Seed Script
 *
 * Populates the database with a demo restaurant and sample data.
 *
 * Usage:
 *   node scripts/seed.mjs              # Seed demo data (skips if data already exists)
 *   node scripts/seed.mjs --force       # Seed even if data exists
 *   node scripts/seed.mjs --production  # Seed only production-safe data (no demo orders)
 *
 * Requirements:
 *   - .env.local must have NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local
try {
  const envPath = join(__dirname, '..', '.env.local')
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex).trim()
        const value = trimmed.slice(eqIndex + 1).trim()
        if (!process.env[key]) {
          process.env[key] = value
        }
      }
    }
  }
} catch {}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const ORG_ID = '00000000-0000-0000-0000-000000000001'
const REST_ID = '00000000-0000-0000-0000-000000000002'
const BRANCH_ID = '00000000-0000-0000-0000-000000000003'
const CAT_MAIN = 'c0000001-0000-0000-0000-000000000001'
const CAT_SAMBUSA = 'c0000001-0000-0000-0000-000000000002'
const CAT_DRINKS = 'c0000001-0000-0000-0000-000000000003'
const CAT_DESSERTS = 'c0000001-0000-0000-0000-000000000004'

async function checkExistingData() {
  const { count } = await supabase
    .from('restaurants')
    .select('*', { count: 'exact', head: true })
  return (count || 0) > 0
}

async function insert(table, rows) {
  const { error } = await supabase.from(table).insert(rows)
  if (error) {
    console.error(`  ✗ ${table}: ${error.message}`)
    return false
  }
  return true
}

async function seed() {
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const production = args.includes('--production')

  const hasData = await checkExistingData()
  if (hasData && !force) {
    console.log('⏭️  Database already has data. Use --force to re-seed.')
    return
  }

  console.log('🌱 Seeding demo data...')
  if (production) console.log('🏭 Production-safe mode (no demo orders)')

  // 1. Organization
  console.log('\n1/9 Organization')
  await insert('organizations', [{
    id: ORG_ID, name: 'Buna Cafe', slug: 'buna-cafe',
    email: 'admin@bunacafe.com', phone: '+251911111111',
    address: 'Bole Road, Addis Ababa',
    onboarding_step: 6, setup_completed: true,
  }])

  // 2. Restaurant
  console.log('2/9 Restaurant')
  await insert('restaurants', [{
    id: REST_ID, name: 'Buna Cafe', slug: 'buna-cafe-rest',
    phone: '+251911111111', email: 'info@bunacafe.com',
    address: 'Bole Road, Addis Ababa',
    currency: 'ETB', tax_rate: 0.15, organization_id: ORG_ID, branch_id: BRANCH_ID,
  }])

  // 3. Branch
  console.log('3/9 Branch')
  await insert('branches', [{
    id: BRANCH_ID, organization_id: ORG_ID, name: 'Main Branch',
    address: 'Bole Road, Addis Ababa', phone: '+251911111111', email: 'buna@cafe.com',
  }])

  // 4. Categories
  console.log('4/9 Categories')
  await insert('categories', [
    { id: CAT_MAIN, restaurant_id: REST_ID, name: 'Main Dishes', name_am: 'ዋና ምግቦች', name_om: 'Nyaata Guddaa', icon: '🍛', sort_order: 1, is_active: true },
    { id: CAT_SAMBUSA, restaurant_id: REST_ID, name: 'Sambusa & Appetizers', name_am: 'ሳምቡሳ እና መክሰስ', name_om: 'Sambusa fi Nyaata Jalqabaa', icon: '🥟', sort_order: 2, is_active: true },
    { id: CAT_DRINKS, restaurant_id: REST_ID, name: 'Drinks', name_am: 'መጠጦች', name_om: 'Dhugaatii', icon: '🥤', sort_order: 3, is_active: true },
    { id: CAT_DESSERTS, restaurant_id: REST_ID, name: 'Desserts', name_am: 'ጣፋጭ ምግቦች', name_om: 'Maakuuxa', icon: '🍰', sort_order: 4, is_active: true },
  ])

  // 5. Menu Items
  console.log('5/9 Menu Items')
  await insert('menu_items', [
    { restaurant_id: REST_ID, category_id: CAT_MAIN, name: 'Doro Wat', name_am: 'ዶሮ ወጥ', name_om: 'Doro Weet', description: 'Spicy chicken stew with berbere spice, served with injera', description_am: 'በበርበሬ ቅመም የተሰራ ዶሮ ወጥ ከእንጀራ ጋር', description_om: 'Doro Weet urgoo berbere qabu, injira wajjin', price: 250, is_available: true, is_featured: true, sort_order: 1 },
    { restaurant_id: REST_ID, category_id: CAT_MAIN, name: 'Kitfo', name_am: 'ክትፎ', name_om: 'Kitfo', description: 'Minced raw beef seasoned with mitmita and niter kibbeh', description_am: 'በሚጥሚጣ እና በንጥር ቅቤ የተቀመመ ጥሬ የበሬ ሥጋ', description_om: 'Foon sa\'a\'ii mitmiitaan fi dhadhaa nitteriidhaan kan mi\'eeffame', price: 350, is_available: true, is_featured: true, sort_order: 2 },
    { restaurant_id: REST_ID, category_id: CAT_MAIN, name: 'Tibs', name_am: 'ጥብስ', name_om: 'Tibsi', description: 'Sautéed beef or lamb with onions, peppers, and rosemary', description_am: 'በሽንኩርት፣ በበርበሬ እና በጥብቅ ቅጠል የተጠበሰ የበሬ ወይም የበግ ሥጋ', description_om: 'Foon sa\'a\'ii ykn hoolaa shunkurtii, barbaree fi qacarree wajjin, waan tt\'ee', price: 280, is_available: true, is_featured: false, sort_order: 3 },
    { restaurant_id: REST_ID, category_id: CAT_MAIN, name: 'Shiro', name_am: 'ሽሮ', name_om: 'Shiro', description: 'Chickpea stew with berbere and garlic, vegan-friendly', description_am: 'ከበርበሬ እና ነጭ ሽንኩርት ጋር የተሰራ ሽምብራ ወጥ', description_om: 'Shiro berbereen fi qullubbii adii wajjin, vegan-friendly', price: 180, is_available: true, is_featured: false, sort_order: 4 },
    { restaurant_id: REST_ID, category_id: CAT_MAIN, name: 'Gomen Besiga', name_am: 'ጎመን በሥጋ', name_om: 'Gomen Besiga', description: 'Collard greens cooked with beef and spices', description_am: 'ከበሬ ሥጋ እና ቅመሞች ጋር የተሰራ ጎመን', description_om: 'Gomen foon sa\'a\'ii fi mi\'eessituu wajjin bilcheeme', price: 220, is_available: true, is_featured: false, sort_order: 5 },
    { restaurant_id: REST_ID, category_id: CAT_MAIN, name: 'Injera (1kg)', name_am: 'እንጀራ (1 ኪ.ግ)', name_om: 'Injira (1kg)', description: 'Traditional Ethiopian sourdough flatbread, 1kg', description_am: 'ባህላዊ የኢትዮጵያ እንጀራ፣ 1 ኪሎ', description_om: 'Buddeenin baqqana, 1kg', price: 100, is_available: true, is_featured: false, sort_order: 6 },
    { restaurant_id: REST_ID, category_id: CAT_MAIN, name: 'Firfir', name_am: 'ፍርፍር', name_om: 'Firfir', description: 'Shredded injera mixed with berbere and clarified butter', description_am: 'የተቆረጠ እንጀራ ከበርበሬ መረቅ ና ንጥር ቅቤ ጋር', description_om: 'Injira ciccitaa berbere fi dhadhaa qulqulluun wal makiinsa', price: 150, is_available: true, is_featured: false, sort_order: 7 },
    { restaurant_id: REST_ID, category_id: CAT_MAIN, name: 'Beyaynetu', name_am: 'ብያይነቱ', name_om: 'Beyaynetu', description: 'Vegetarian platter with assorted Ethiopian dishes', description_am: 'የተለያዩ የኢትዮጵያ ምግቦች የተካተቱበት የቬጀቴሪያን', description_om: 'Qiraa warqaanaa kan nyaata addaa addaa', price: 300, is_available: true, is_featured: true, sort_order: 8 },
    { restaurant_id: REST_ID, category_id: CAT_SAMBUSA, name: 'Sambusa (Beef)', name_am: 'ሳምቡሳ (በሬ)', name_om: 'Sambusa (Sa\'a)', description: 'Deep-fried pastry filled with seasoned ground beef', description_am: 'በተቀመመ የበሬ ሥጋ የተሞላ የተጠበሰ ሳምቡሳ', description_om: 'Sambusa foon sa\'a\'iidhaan kan guute', price: 80, is_available: true, is_featured: false, sort_order: 1 },
    { restaurant_id: REST_ID, category_id: CAT_SAMBUSA, name: 'Sambusa (Lentil)', name_am: 'ሳምቡሳ (ምስር)', name_om: 'Sambusa (Mishira)', description: 'Deep-fried pastry filled with spiced red lentils', description_am: 'በተቀመመ ምስር የተሞላ የተጠበሰ ሳምቡሳ', description_om: 'Sambusa misra mi\'eessituudhaan kan guute', price: 60, is_available: true, is_featured: false, sort_order: 2 },
    { restaurant_id: REST_ID, category_id: CAT_DRINKS, name: 'Ethiopian Coffee', name_am: 'ኢትዮጵያ ቡና', name_om: 'Buna Itoophiyaa', description: 'Traditional Ethiopian coffee ceremony serving', description_am: 'ባህላዊ የኢትዮጵያ ቡና ሥነ ሥርዓት', description_om: 'Aadaa bunaa Itoophiyaa', price: 50, is_available: true, is_featured: true, sort_order: 1 },
    { restaurant_id: REST_ID, category_id: CAT_DRINKS, name: 'Tej (Honey Wine)', name_am: 'ጠጅ', name_om: 'Tej', description: 'Traditional Ethiopian honey wine, 500ml', description_am: 'ባህላዊ የኢትዮጵያ ማር ወይን', description_om: 'Daadhii Itoophiyaa', price: 120, is_available: true, is_featured: false, sort_order: 2 },
    { restaurant_id: REST_ID, category_id: CAT_DRINKS, name: 'Fresh Juice', name_am: 'ትኩስ ጭማቂ', name_om: 'Kuwaarii Haaraa', description: 'Freshly squeezed mango, papaya, or avocado juice', description_am: 'የማንጎ፣ ፓፓያ ወይም አቮካዶ ትኩስ ጭማቂ', description_om: 'Mango, paappayyaa ykn avokaadoo, haaraa cuunfame', price: 80, is_available: true, is_featured: false, sort_order: 3 },
    { restaurant_id: REST_ID, category_id: CAT_DRINKS, name: 'Sprite', name_am: 'ስፕራይት', name_om: 'Sprite', description: 'Carbonated soft drink, 330ml', description_am: 'የካርቦን ለስላሳ መጠጥ', description_om: 'Dhugaatii Softii kan kaarboonii qabu', price: 40, is_available: true, is_featured: false, sort_order: 4 },
    { restaurant_id: REST_ID, category_id: CAT_DESSERTS, name: 'Kicha', name_am: 'ቂጣ', name_om: 'Kichaa', description: 'Sweet bread with raisins and cardamom', description_am: 'ዘቢብ እና ከርዳሞም ያለው ጣፋጭ እንጀራ', description_om: 'Maxinoo mi\'ee kan zabiiibiifi kaardaamoomii qabu', price: 60, is_available: true, is_featured: false, sort_order: 1 },
    { restaurant_id: REST_ID, category_id: CAT_DESSERTS, name: 'Halwa', name_am: 'ሃልዋ', name_om: 'Halwa', description: 'Traditional sesame-based sweet dessert', description_am: 'ባህላዊ የሰሊጥ ጣፋጭ ምግብ', description_om: 'Maakuuxa saliidadhaan kan mi\'eessu', price: 70, is_available: true, is_featured: false, sort_order: 2 },
  ])

  // 6. Tables
  console.log('6/9 Tables')
  await insert('tables', [
    { id: 't0000001-0000-0000-0000-000000000001', restaurant_id: REST_ID, table_number: 1, capacity: 2, status: 'available' },
    { id: 't0000001-0000-0000-0000-000000000002', restaurant_id: REST_ID, table_number: 2, capacity: 2, status: 'available' },
    { id: 't0000001-0000-0000-0000-000000000003', restaurant_id: REST_ID, table_number: 3, capacity: 4, status: 'available' },
    { id: 't0000001-0000-0000-0000-000000000004', restaurant_id: REST_ID, table_number: 4, capacity: 4, status: 'available' },
    { id: 't0000001-0000-0000-0000-000000000005', restaurant_id: REST_ID, table_number: 5, capacity: 6, status: 'available' },
    { id: 't0000001-0000-0000-0000-000000000006', restaurant_id: REST_ID, table_number: 6, capacity: 6, status: 'available' },
    { id: 't0000001-0000-0000-0000-000000000007', restaurant_id: REST_ID, table_number: 7, capacity: 8, status: 'occupied' },
    { id: 't0000001-0000-0000-0000-000000000008', restaurant_id: REST_ID, table_number: 8, capacity: 4, status: 'available' },
    { id: 't0000001-0000-0000-0000-000000000009', restaurant_id: REST_ID, table_number: 9, capacity: 2, status: 'available' },
    { id: 't0000001-0000-0000-0000-000000000010', restaurant_id: REST_ID, table_number: 10, capacity: 4, status: 'cleaning' },
  ])

  // 7. Employees
  console.log('7/9 Employees')
  await insert('employees', [
    { id: 'e0000001-0000-0000-0000-000000000001', restaurant_id: REST_ID, full_name: 'Abebe Kebede', phone: '+251911111101', email: 'abebe@bunacafe.com', role: 'admin', salary: 25000, hire_date: '2024-01-15', digital_employee_id: 'RMD-BUNA-2024-0001', is_active: true },
    { id: 'e0000001-0000-0000-0000-000000000002', restaurant_id: REST_ID, full_name: 'Almaz Tadesse', phone: '+251911111102', email: 'almaz@bunacafe.com', role: 'manager', salary: 18000, hire_date: '2024-02-01', digital_employee_id: 'RMD-BUNA-2024-0002', is_active: true },
    { id: 'e0000001-0000-0000-0000-000000000003', restaurant_id: REST_ID, full_name: 'Biruk Hailu', phone: '+251911111103', email: 'biruk@bunacafe.com', role: 'waiter', salary: 6000, hire_date: '2024-03-01', digital_employee_id: 'RMD-BUNA-2024-0003', is_active: true },
    { id: 'e0000001-0000-0000-0000-000000000004', restaurant_id: REST_ID, full_name: 'Chaltu Ayana', phone: '+251911111104', email: 'chaltu@bunacafe.com', role: 'waiter', salary: 6000, hire_date: '2024-03-01', digital_employee_id: 'RMD-BUNA-2024-0004', is_active: true },
    { id: 'e0000001-0000-0000-0000-000000000005', restaurant_id: REST_ID, full_name: 'Dawit Eshetu', phone: '+251911111105', email: 'dawit@bunacafe.com', role: 'cashier', salary: 8000, hire_date: '2024-03-15', digital_employee_id: 'RMD-BUNA-2024-0005', is_active: true },
    { id: 'e0000001-0000-0000-0000-000000000006', restaurant_id: REST_ID, full_name: 'Eleni Mesfin', phone: '+251911111106', email: 'eleni@bunacafe.com', role: 'manager', salary: 15000, hire_date: '2024-04-01', digital_employee_id: 'RMD-BUNA-2024-0006', is_active: true },
  ])

  // 8. Subscription
  console.log('8/9 Subscription')
  const { data: plans } = await supabase.from('subscription_plans').select('id').eq('name', 'Growth').single()
  if (plans) {
    await insert('subscriptions', [{
      organization_id: ORG_ID, plan_id: plans.id, status: 'active',
      billing_cycle: 'monthly',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    }])
  }

  // 9. Kitchen Stations
  console.log('9/9 Kitchen Stations')
  await insert('kitchen_stations', [
    { restaurant_id: REST_ID, name: 'Grill Station', name_am: 'የጥብስ ቦታ', name_om: 'Bakka tibsi' },
    { restaurant_id: REST_ID, name: 'Stew Station', name_am: 'የወጥ ቦታ', name_om: 'Bakka weettii' },
    { restaurant_id: REST_ID, name: 'Beverage Station', name_am: 'የመጠጥ ቦታ', name_om: 'Bakka dhugaattii' },
  ])

  console.log('\n✅ Demo data seeded successfully!')
  console.log()
  console.log('📋 Demo Restaurant: Buna Cafe')
  console.log('🌐 Menu URL: http://localhost:3000/menu/t0000001-0000-0000-0000-000000000001')
  console.log()
  console.log('📊 Created:')
  console.log('   • 1 Organization + 1 Restaurant + 1 Branch')
  console.log('   • 4 Categories with 16 Menu Items')
  console.log('   • 10 Tables')
  console.log('   • 6 Employees')
  console.log('   • 1 Subscription (Growth Plan)')
  console.log('   • 3 Kitchen Stations')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
