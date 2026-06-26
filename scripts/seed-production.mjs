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

const uid = () => crypto.randomUUID()
const ts = Date.now().toString(36)
const p = (s) => { console.log(s); return true }

async function ins(table, rows) {
  if (!rows?.length) return true
  const { error } = await supabase.from(table).insert(rows)
  if (error) { console.error(`  \u2717 ${table}: ${error.message.substring(0, 100)}`); return false }
  return true
}

async function seed() {
  console.log('Seeding Habesha Grand Restaurant (run: ' + ts + ')\n')

  // ── PHASE 1 ──
  console.log('=== PHASE 1: Restaurant Creation ===')
  const ORG_ID = uid(), REST_ID = uid(), BIDS = [uid(), uid(), uid()]

  if (!await ins('organizations', [{ id: ORG_ID, name: 'Habesha Grand Restaurant', slug: 'habesha-grand-' + ts, email: 'info@habeshagrand.com', phone: '+251911000001', address: 'Bole Road, Addis Ababa', onboarding_step: 6, setup_completed: true }])) process.exit(1)
  p('  \u2713 Organization created')

  const branchData = [
    { name: 'Adama Main Branch', address: 'Adama City, Main Street', phone: '+251220000001', email: 'adama@habeshagrand.com' },
    { name: 'Addis Ababa Branch', address: 'Bole Subcity, Addis Ababa', phone: '+251110000001', email: 'addis@habeshagrand.com' },
    { name: 'Hawassa Branch', address: 'Hawassa City, Lake View', phone: '+251460000001', email: 'hawassa@habeshagrand.com' },
  ]
  if (!await ins('branches', branchData.map((b, i) => ({ id: BIDS[i], organization_id: ORG_ID, name: b.name, address: b.address, phone: b.phone, email: b.email, currency: 'ETB', tax_rate: 15 })))) process.exit(1)
  p('  \u2713 3 Branches: Adama, Addis Ababa, Hawassa')

  if (!await ins('restaurants', [{ id: REST_ID, name: 'Habesha Grand Restaurant', slug: 'habesha-rest-' + ts, phone: '+251911000001', email: 'info@habeshagrand.com', address: 'Bole Road, Addis Ababa', currency: 'ETB', tax_rate: 0.15, organization_id: ORG_ID, branch_id: BIDS[0] }])) process.exit(1)
  p('  \u2713 Restaurant created')

  // ── PHASE 2-3: Staff ──
  console.log('\n=== PHASE 2-3: 29 Employees ===')
  const staff = [
    { n: 'Biruk Fikadu', p: '911000101', r: 'admin', s: 50000, b: 0 },
    { n: 'Abel Tesfaye', p: '911000102', r: 'admin', s: 35000, b: 0 },
    { n: 'Meron Bekele', p: '911000103', r: 'admin', s: 35000, b: 1 },
    { n: 'Selamawit Desta', p: '911000104', r: 'manager', s: 25000, b: 0 },
    { n: 'Henok Alemu', p: '911000105', r: 'manager', s: 25000, b: 1 },
    { n: 'Lidya Haile', p: '911000106', r: 'manager', s: 25000, b: 2 },
    { n: 'Tigist Wondimu', p: '911000107', r: 'cashier', s: 10000, b: 0 },
    { n: 'Ephrem Gizaw', p: '911000108', r: 'cashier', s: 10000, b: 0 },
    { n: 'Saron Mulugeta', p: '911000109', r: 'cashier', s: 10000, b: 1 },
    { n: 'Dawit Hailu', p: '911000110', r: 'cashier', s: 10000, b: 1 },
    { n: 'Hiwot Tilahun', p: '911000111', r: 'cashier', s: 10000, b: 2 },
    { n: 'Kebede Lemma', p: '911000112', r: 'waiter', s: 7000, b: 0 },
    { n: 'Meseret Tadesse', p: '911000113', r: 'waiter', s: 7000, b: 0 },
    { n: 'Abiyot Ayele', p: '911000114', r: 'waiter', s: 7000, b: 0 },
    { n: 'Beza Tesfaye', p: '911000115', r: 'waiter', s: 7000, b: 0 },
    { n: 'Chaltu Gemechu', p: '911000116', r: 'waiter', s: 7000, b: 1 },
    { n: 'Dejen Mamo', p: '911000117', r: 'waiter', s: 7000, b: 1 },
    { n: 'Eyerusalem Wondimu', p: '911000118', r: 'waiter', s: 7000, b: 1 },
    { n: 'Fikirte Ayalew', p: '911000119', r: 'waiter', s: 7000, b: 1 },
    { n: 'Gashaw Melese', p: '911000120', r: 'waiter', s: 7000, b: 2 },
    { n: 'Hana Abebe', p: '911000121', r: 'waiter', s: 7000, b: 2 },
    { n: 'Biniyam Abebe', p: '911000122', r: 'kitchen_staff', s: 9000, b: 0 },
    { n: 'Sisay Mulugeta', p: '911000123', r: 'kitchen_staff', s: 9000, b: 0 },
    { n: 'Zenebech Woldie', p: '911000124', r: 'kitchen_staff', s: 9000, b: 1 },
    { n: 'Tadesse Hailu', p: '911000125', r: 'kitchen_staff', s: 9000, b: 1 },
    { n: 'Birhane Girmay', p: '911000126', r: 'kitchen_staff', s: 9000, b: 2 },
    { n: 'Mekdes Abera', p: '911000127', r: 'inventory_manager', s: 13000, b: 0 },
    { n: 'Tamrat Bekele', p: '911000128', r: 'inventory_manager', s: 13000, b: 1 },
    { n: 'Genet Assefa', p: '911000129', r: 'inventory_manager', s: 13000, b: 2 },
  ]
  const EIDS = staff.map(() => uid())
  if (await ins('employees', staff.map((s, i) => ({
    id: EIDS[i], restaurant_id: REST_ID, full_name: s.n,
    phone: '+' + s.p + '-' + ts, email: s.n.toLowerCase().replace(/\s+/g, '.') + '+' + ts + '@habeshagrand.com',
    role: s.r, salary: s.s, hire_date: '2026-01-15',
    digital_employee_id: 'HGR-' + ts + '-' + String(i + 1).padStart(4, '0'), is_active: true,
  })))) p('  \u2713 29 employees created')

  // Kitchen stations
  const KIDS = ['a','b','c','d','e'].map(() => uid())
  await ins('kitchen_stations', KIDS.map((id, i) => ({ id, restaurant_id: REST_ID, name: ['Grill','Stew','Beverage','Pizza','Salad'][i] + ' Station', is_active: true })))
  p('  \u2713 5 kitchen stations')

  // ── PHASE 4: Tables ──
  console.log('\n=== PHASE 4: 45 Tables ===')
  const TIDS = []
  const tbls = []
  for (let b = 0; b < 3; b++) {
    const wtrs = EIDS.filter((_, i) => staff[i].r === 'waiter' && staff[i].b === b)
    for (let t = 0; t < 15; t++) {
      const id = uid(); TIDS.push(id)
      tbls.push({ id, restaurant_id: REST_ID, table_number: b * 100 + t + 1, capacity: [2, 4, 4, 6, 8][t % 5], status: 'available', assigned_waiter_id: wtrs[t % wtrs.length] })
    }
  }
  if (await ins('tables', tbls)) p('  \u2713 45 tables across 3 branches')

  // ── PHASE 5: Categories ──
  console.log('\n=== PHASE 5: 15 Categories ===')
  const cats = [
    ['Breakfast','\u1241\u1229\u1235','Ciree','\uD83C\uDF73'],
    ['Traditional Foods','\u1263\u1215\u120D\u12CB \u121D\u130D\u1266\u127D','Nyaata Aadaa','\uD83C\uDF5B'],
    ['Pasta','\u1363\u1235\u1273','Paastaa','\uD83C\uDF5D'],
    ['Pizza','\u1362\u12B6','Piizaa','\uD83C\uDF55'],
    ['Burgers','\u1261\u122D\u1308\u122D','Baargarii','\uD83C\uDF54'],
    ['Chicken','\u12F0\u122E','Lukkuu','\uD83C\uDF57'],
    ['Fish','\u12C3','Qurxummii','\uD83D\uDC1F'],
    ['Vegetarian','\u126C\u1303\u1274\u122E\u12EB\u1295','Nyaata Hunda','\uD83E\uDD57'],
    ['Desserts','\u1303\u134D\u130C \u121D\u130D\u1266\u127D','Maakuuxa','\uD83C\uDF70'],
    ['Hot Drinks','\u1219\u1265 \u1218\u1300\u1266\u127D','Dhugaatii Hoa','\u2615'],
    ['Cold Drinks','\u1240\u12DD\u12CA\u12B5 \u1218\u1300\u1266\u127D','Dhugaatii Qorraa','\uD83E\uDD64'],
    ['Juices','\u130D\u121B\u1242\u12CE\u127D','Kuwaariilee','\uD83E\uDD67'],
    ['Cocktails','\u12AE\u12AD\u1274\u12ED\u120D','Kokteelii','\uD83C\uDF78'],
    ['Wines','\u12E8\u12ED\u1295','Wayinii','\uD83C\uDF77'],
    ['Specials','\u120D\u12EE \u121D\u130D\u1266\u127D','Addatii','\uD83C\uDF1F'],
  ]
  const CATIDS = cats.map(() => uid())
  await ins('categories', cats.map((c, i) => ({ id: CATIDS[i], restaurant_id: REST_ID, name: c[0], name_am: c[1], name_om: c[2], icon: c[3], sort_order: i + 1, is_active: true })))
  p('  \u2713 15 categories')

  // ── PHASE 6: Menu Items ──
  console.log('\n=== PHASE 6: ~100 Menu Items ===')
  const menus = [
    [0,'Firfir',200,'Shredded injera with berbere'],
    [0,'Chechena',180,'Pan-fried bread with spice'],
    [0,'Enkulal Firfir',200,'Scrambled eggs with injera'],
    [0,'Kita Firfir',120,'Pan bread with berbere'],
    [0,'Bread & Omelette',160,'Fresh bread with egg'],
    [0,'Ful Medames',100,'Fava bean stew'],
    [0,'Cereal Bowl',130,'Mixed cereals with milk'],
    [1,'Doro Wat',350,'Spicy chicken stew with egg'],
    [1,'Kitfo',400,'Minced raw beef mitmita'],
    [1,'Tibs',320,'Sauteed beef with onions'],
    [1,'Shiro',180,'Chickpea stew berbere'],
    [1,'Beyaynetu',350,'Vegetarian platter'],
    [1,'Gomen Besiga',250,'Collard greens with beef'],
    [1,'Misir Wat',160,'Red lentil stew'],
    [1,'Atkilt Wat',150,'Mixed vegetable stew'],
    [1,'Kik Alicha',140,'Split pea turmeric'],
    [1,'Derek Tibs',380,'Dry fried beef cubes'],
    [1,'Shekla Tibs',450,'Clay pot sizzling beef'],
    [1,'Kurt',300,'Raw beef hot sauce'],
    [1,'Dulet',250,'Minced tripe mitmita'],
    [1,'Bozena Shiro',200,'Special shiro lamb'],
    [1,'Injera 1kg',100,'Sourdough flatbread'],
    [2,'Spaghetti Bolognese',280,'Meat sauce pasta'],
    [2,'Lasagna',350,'Layered pasta bechamel'],
    [2,'Penne Arrabbiata',250,'Spicy tomato pasta'],
    [2,'Fettuccine Alfredo',300,'Creamy white pasta'],
    [2,'Mac & Cheese',220,'Baked macaroni cheese'],
    [2,'Pesto Pasta',280,'Basil pesto penne'],
    [3,'Margherita Pizza',350,'Tomato mozzarella basil'],
    [3,'Pepperoni Pizza',400,'Pepperoni mozzarella'],
    [3,'Vegetarian Pizza',320,'Grilled vegetables'],
    [3,'Hawaiian Pizza',380,'Ham pineapple'],
    [3,'Ethiopian Special Pizza',450,'Doro wat inspired'],
    [3,'BBQ Chicken Pizza',420,'BBQ chicken red onion'],
    [4,'Classic Beef Burger',280,'Beef patty lettuce tomato'],
    [4,'Chicken Burger',260,'Grilled chicken fillet'],
    [4,'Cheese Burger',320,'Beef patty melted cheese'],
    [4,'Veggie Burger',220,'Plant-based patty'],
    [4,'Double Stack Burger',400,'Double beef patty'],
    [5,'Fried Chicken 4pcs',350,'Crispy fried chicken'],
    [5,'Grilled Chicken',380,'Herb-marinated chicken'],
    [5,'Chicken Wings 12',420,'Buffalo BBQ wings'],
    [5,'Chicken Parmesan',360,'Breaded marinara'],
    [5,'Chicken Curry',320,'Creamy chicken curry rice'],
    [5,'Chicken Stir Fry',300,'Wok-fried veg chicken'],
    [6,'Grilled Tilapia',380,'Whole grilled spice'],
    [6,'Fish and Chips',320,'Beer-battered fries'],
    [6,'Salmon Fillet',480,'Pan-seared lemon butter'],
    [6,'Fish Curry',300,'Coconut curry sauce'],
    [6,'Shrimp Scampi',450,'Garlic butter shrimp'],
    [7,'Vegetable Curry',200,'Mixed vegetable curry'],
    [7,'Lentil Soup',120,'Hearty red lentil'],
    [7,'Falafel Plate',220,'Chickpea fritters pita'],
    [7,'Hummus & Pita',160,'Creamy hummus pita'],
    [7,'Greek Salad',200,'Feta olives cucumber'],
    [7,'Caesar Salad',220,'Romaine croutons parmesan'],
    [8,'Cheesecake',180,'New York style cheesecake'],
    [8,'Chocolate Cake',160,'Rich chocolate layer'],
    [8,'Tiramisu',200,'Italian coffee dessert'],
    [8,'Ice Cream 3 scoops',120,'Vanilla chocolate strawberry'],
    [8,'Fruit Platter',250,'Seasonal fresh fruits'],
    [8,'Brownie Sundae',200,'Warm brownie ice cream'],
    [9,'Ethiopian Coffee',50,'Traditional coffee ceremony'],
    [9,'Cappuccino',70,'Steamed milk foam'],
    [9,'Latte',70,'Espresso warm milk'],
    [9,'Macchiato',60,'Espresso milk foam'],
    [9,'Tea Black Green',30,'Premium tea'],
    [9,'Spiced Tea',40,'Cinnamon cardamom ginger'],
    [9,'Hot Chocolate',65,'Rich hot cocoa'],
    [9,'Espresso',40,'Double shot espresso'],
    [10,'Coca Cola',35,'330ml can'],
    [10,'Sprite',35,'330ml can'],
    [10,'Fanta Orange',35,'330ml can'],
    [10,'Mineral Water',20,'Pure mineral water 500ml'],
    [10,'Energy Drink',80,'Carbonated energy drink'],
    [10,'Iced Tea',45,'Lemon iced tea'],
    [11,'Mango Juice',80,'Fresh mango juice'],
    [11,'Avocado Juice',90,'Creamy avocado shake'],
    [11,'Papaya Juice',80,'Fresh papaya juice'],
    [11,'Orange Juice',70,'Fresh squeezed orange'],
    [11,'Mixed Fruit Juice',100,'Assorted fresh fruits'],
    [11,'Strawberry Juice',90,'Fresh strawberry juice'],
    [11,'Lemonade',50,'Fresh lemonade mint'],
    [12,'Ethiopian Sunrise',250,'Tej-based orange juice'],
    [12,'Mojito',220,'Classic mint mojito'],
    [12,'Pina Colada',250,'Pineapple coconut'],
    [12,'Tequila Sunrise',280,'Tequila orange grenadine'],
    [12,'Margarita',260,'Classic lime margarita'],
    [13,'Red Wine Glass',180,'House red wine'],
    [13,'White Wine Glass',180,'House white wine'],
    [13,'Tej Honey Wine',150,'Traditional honey wine 500ml'],
    [13,'Sparkling Wine',350,'Italian prosecco'],
    [14,'Chef Special Platter',600,'Assorted traditional international'],
    [14,'Family Mix Grill',800,'Mixed grill 4 persons'],
    [14,'Seafood Platter',700,'Assorted seafood 2'],
    [14,'Veggie Platter',400,'Vegetarian combo'],
    [14,'Breakfast Special',250,'Full breakfast coffee'],
  ]
  const MIIDS = menus.map(() => uid())
  await ins('menu_items', menus.map((m, i) => ({
    id: MIIDS[i], restaurant_id: REST_ID, category_id: CATIDS[m[0]],
    name: m[1], name_am: m[1], name_om: m[1],
    description: m[3], description_am: m[3], description_om: m[3],
    price: m[2], is_available: true, is_featured: i < 10, sort_order: i + 1,
  })))
  p('  \u2713 ' + menus.length + ' menu items')

  // ── PHASE 7: Inventory ──
  console.log('\n=== PHASE 7: Inventory ===')
  let { data: units } = await supabase.from('units_of_measure').select('id, name')
  if (!units?.length) {
    await ins('units_of_measure', [
      { name: 'Kilogram', symbol: 'kg', category: 'weight' },
      { name: 'Gram', symbol: 'g', category: 'weight' },
      { name: 'Liter', symbol: 'L', category: 'volume' },
      { name: 'Piece', symbol: 'pc', category: 'count' },
    ])
    const { data: u } = await supabase.from('units_of_measure').select('id, name'); units = u
  }
  const umap = {}; for (const u of units) umap[u.name] = u.id

  const ings = ['Chicken','Beef','Lamb','Fish','Shrimp','Eggs','Milk','Butter','Cheese','Cream','Onion','Tomato','Garlic','Ginger','Lettuce','Lemon','Berbere','Mitmita','Turmeric','Cumin','Paprika','Cinnamon','Cardamom','Flour','Rice','Pasta','Pizza Dough','Bread','Sugar','Coffee Beans','Tea Leaves','Cooking Oil','Salt','Pepper','Soy Sauce','Pasta Sauce','Ketchup','Mayonnaise','Yogurt','Mustard']
  const IIDS = ings.map(() => uid())
  await ins('ingredients', ings.map((n, i) => ({ id: IIDS[i], restaurant_id: REST_ID, name: n, unit_id: umap['Kilogram'] || umap['Piece'], is_active: true })))
  p('  \u2713 40 ingredients')

  const sups = ['Addis Meat Supply','Bole Fresh Produce','Ethiopian Spice Co.','Shewa Dairy','Grain Millers','Awash Beverage','Adama Poultry','Hawassa Fish Market','Rift Valley Oil','Bread Express','Imported Foods','Green Valley Organics','Ethio Cheese','Coffee Bean Direct','Honey Wine Cellars','Pizza Supply Co.','Bole Condiments','Addis Frozen Foods','Mekelle Dry Goods','Jimma Spice Market']
  const SIDS = sups.map(() => uid())
  await ins('suppliers', sups.map((n, i) => ({ id: SIDS[i], restaurant_id: REST_ID, name: n, contact_person: 'Contact ' + (i + 1), phone: '+25191100' + String(200 + i).padStart(3, '0'), email: 'supplier' + i + '+' + ts + '@example.com', payment_terms: '45 days' })))
  p('  \u2713 20 suppliers')

  await ins('stock_items', IIDS.map(id => ({ restaurant_id: REST_ID, ingredient_id: id, current_quantity: Math.floor(Math.random() * 100) + 10, unit_id: umap['Kilogram'] || umap['Piece'], reorder_level: 20, reorder_quantity: 50, unit_cost: Math.floor(Math.random() * 500) + 20 })))
  p('  \u2713 40 stock items')

  const pos = []
  for (let i = 0; i < 30; i++) pos.push({ id: uid(), restaurant_id: REST_ID, supplier_id: SIDS[i % SIDS.length], order_number: 'PO-' + ts + '-' + String(i + 1).padStart(5, '0'), status: ['received','ordered','draft'][i % 3], order_date: new Date(2026, 4 + Math.floor(i / 10), (i % 28) + 1).toISOString().split('T')[0], total_amount: Math.floor(Math.random() * 5000) + 1000 })
  await ins('purchase_orders', pos)
  p('  \u2713 30 purchase orders')

  const moves = []
  for (let i = 0; i < 100; i++) moves.push({ restaurant_id: REST_ID, ingredient_id: IIDS[i % IIDS.length], quantity: Math.floor(Math.random() * 50) + 1, type: 'in', notes: 'Movement ' + (i + 1) })
  await ins('stock_movements', moves)
  p('  \u2713 100 stock movements')

  const wastes = []
  for (let i = 0; i < 20; i++) wastes.push({ restaurant_id: REST_ID, ingredient_id: IIDS[i % IIDS.length], quantity: Math.floor(Math.random() * 5) + 1, reason: ['Spoilage','Overcooked','Expired','Damaged','Prep loss'][i % 5] })
  await ins('wastage_records', wastes)
  p('  \u2713 20 wastage records')

  // ── PHASE 8: Payroll ──
  console.log('\n=== PHASE 8: Payroll ===')
  const pays = staff.map((s, i) => ({
    restaurant_id: REST_ID, employee_id: EIDS[i], month: 6, year: 2026,
    salary: s.s, bonuses: s.s > 20000 ? 2000 : 0, deductions: 500,
    net_pay: s.s + (s.s > 20000 ? 2000 : 0) - 500,
    status: 'paid', paid_at: new Date().toISOString(),
  }))
  if (await ins('payrolls', pays)) p('  \u2713 29 payroll records')

  // ── PHASE 12-14: Orders ──
  console.log('\n=== PHASE 12-14: Orders & Payments ===')
  const { data: dbTbls } = await supabase.from('tables').select('id').eq('restaurant_id', REST_ID)
  const orderStatuses = ['completed','paid','delivered','ready','preparing','accepted','pending']
  const payMethods = ['cash','telebirr','cbe_birr','chapa','bank']
  const cnames = ['Abebe Kebede','Almaz Tadesse','Biruk Hailu','Chaltu Ayana','Dawit Eshetu','Eleni Mesfin','Fikirte Ayele','Gashaw Melese','Hana Abebe','Kebede Lemma','Lidya Haile','Meron Bekele','Selamawit Desta','Tigist Wondimu','Zenebech Woldie','Tadesse Hailu','Mekedes Abera','Sisay Mulugeta','Beza Tesfaye','Henok Alemu']

  const orders = [], orderItems = [], payments = []
  for (let i = 0; i < 100; i++) {
    const oid = uid()
    const ic = Math.floor(Math.random() * 5) + 2
    const st = orderStatuses[i < 70 ? (i % 4) : (i % 7)]
    let total = 0

    orders.push({ id: oid, restaurant_id: REST_ID, table_id: dbTbls[i % dbTbls.length].id, customer_name: cnames[i % cnames.length], status: st, total_amount: 0, notes: i % 10 === 0 ? 'Extra spicy' : null, created_at: new Date(2026, 5, (i % 28) + 1, 8 + (i % 12)).toISOString() })

    for (let j = 0; j < ic; j++) {
      const m = menus[(i * 3 + j) % menus.length]
      const q = Math.floor(Math.random() * 3) + 1
      total += m[2] * q
      orderItems.push({ order_id: oid, menu_item_id: MIIDS[(i * 3 + j) % MIIDS.length], quantity: q, unit_price: m[2], subtotal: m[2] * q, prep_status: ['new','preparing','ready'][j % 3] })
    }
    orders[orders.length - 1].total_amount = total
    if (st === 'paid' || st === 'completed') {
      payments.push({ order_id: oid, restaurant_id: REST_ID, provider: payMethods[i % payMethods.length], amount: total, status: 'completed', paid_at: new Date(2026, 5, (i % 28) + 1).toISOString(), currency: 'ETB' })
    }
  }

  if (await ins('orders', orders)) p('  \u2713 100 orders')
  let oiOk = 0
  for (let i = 0; i < orderItems.length; i += 50) {
    if (await ins('order_items', orderItems.slice(i, i + 50))) oiOk += Math.min(50, orderItems.length - i)
  }
  p('  \u2713 ' + oiOk + '/' + orderItems.length + ' order items')
  if (payments.length) {
    if (await ins('payment_transactions', payments)) p('  \u2713 ' + payments.length + ' payments')
  }

  // Extra payments
  const extraPay = []
  for (let i = 0; i < 100; i++) extraPay.push({ restaurant_id: REST_ID, order_id: orders[i % orders.length].id, provider: payMethods[i % payMethods.length], amount: Math.floor(Math.random() * 2000) + 100, status: 'completed', paid_at: new Date(2026, 5, (i % 28) + 1).toISOString(), currency: 'ETB' })
  if (await ins('payment_transactions', extraPay)) p('  \u2713 100 additional payments')

  // Subscription
  const { data: plans } = await supabase.from('subscription_plans').select('id').eq('name', 'Enterprise').single()
  if (plans) await ins('subscriptions', [{ organization_id: ORG_ID, plan_id: plans.id, status: 'active', billing_cycle: 'monthly', current_period_start: new Date().toISOString(), current_period_end: new Date(Date.now() + 30 * 86400000).toISOString() }])

  // ── SUMMARY ──
  console.log('\n' + '='.repeat(45))
  console.log('SEED COMPLETE')
  console.log('='.repeat(45) + '\n')

  const tables = ['organizations','restaurants','branches','employees','tables','categories','menu_items','ingredients','suppliers','purchase_orders','stock_movements','wastage_records','payrolls','orders','order_items','kitchen_stations','stock_items']
  for (const t of tables) {
    const { count } = await supabase.from(t).select('*', { count: 'exact', head: true })
    console.log('  ' + t + ': ' + (count || 0))
  }
}

seed().catch(e => { console.error('Failed:', e.message); process.exit(1) })
