import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireRole } from '@/lib/utils/tenant'

const SYSTEM_PROMPT = `You are an AI assistant for a restaurant management system. 
Given a natural language question about restaurant data, generate a SQL query to answer it.

Database tables:
- orders(id, restaurant_id, table_id, status, total_amount, created_at, customer_name)
- order_items(id, order_id, menu_item_id, quantity, unit_price, subtotal)
- menu_items(id, restaurant_id, name, price, category_id)
- categories(id, name)
- tables(id, table_number, capacity, status)
- employees(id, full_name, role, salary)
- stock_items(id, ingredient_id, current_quantity, reorder_level)
- ingredients(id, name, category)

Rules:
- Only generate SELECT queries
- Always filter by restaurant_id
- Use CURRENT_DATE for today
- Return the SQL query and a brief explanation

Respond in JSON format: { "sql": "...", "explanation": "..." }`

export async function POST(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'manager')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  let query: string, restaurant_id: string
  try {
    const body = await request.json()
    query = body.query
    restaurant_id = body.restaurant_id
  } catch {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'Invalid JSON body' } }, { status: 400 })
  }

  if (!query || !restaurant_id) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'query and restaurant_id are required' } }, { status: 400 })
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(restaurant_id)) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'Invalid restaurant_id format' } }, { status: 400 })
  }

  const lowerQuery = query.toLowerCase()

  interface QueryResult {
    data: unknown
    sql: string
    explanation: string
    answer: string
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayISO = todayStart.toISOString()
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1).toISOString()

  if (lowerQuery.includes('today sales') || lowerQuery.includes('today') && (lowerQuery.includes('sale') || lowerQuery.includes('revenue'))) {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('restaurant_id', restaurant_id)
      .gte('created_at', todayISO)
      .in('status', ['paid', 'completed'])

    if (error) {
      return NextResponse.json({ data: null, answer: 'I cannot find that information right now. Try asking about sales, menu items, or inventory.' })
    }

    const rows = orders || []
    const total = rows.reduce((sum: number, r: { total_amount: number }) => sum + Number(r.total_amount || 0), 0)
    const count = rows.length
    const answer = `Today's total revenue and order count: ETB ${total.toLocaleString()} from ${count} orders.`

    return NextResponse.json({
      data: orders,
      answer,
      sql: `SELECT SUM(total_amount) as revenue, COUNT(*) as orders FROM orders WHERE restaurant_id = '${restaurant_id}' AND DATE(created_at) = CURRENT_DATE AND status IN ('paid', 'completed')`,
    })
  }

  if (lowerQuery.includes('month sales') || lowerQuery.includes('month') && (lowerQuery.includes('sale') || lowerQuery.includes('revenue'))) {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('restaurant_id', restaurant_id)
      .gte('created_at', monthStart)
      .in('status', ['paid', 'completed'])

    if (error) {
      return NextResponse.json({ data: null, answer: 'I cannot find that information right now. Try asking about sales, menu items, or inventory.' })
    }

    const rows = orders || []
    const total = rows.reduce((sum: number, r: { total_amount: number }) => sum + Number(r.total_amount || 0), 0)
    const answer = `This month's total revenue: ETB ${total.toLocaleString()}.`

    return NextResponse.json({
      data: orders,
      answer,
      sql: `SELECT SUM(total_amount) as revenue FROM orders WHERE restaurant_id = '${restaurant_id}' AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE) AND status IN ('paid', 'completed')`,
    })
  }

  if (lowerQuery.includes('popular item') || lowerQuery.includes('popular') || lowerQuery.includes('best seller')) {
    const { data: items, error } = await supabase
      .from('order_items')
      .select('quantity, menu_item:menu_item_id(name)')
      .gte('created_at', todayStart.toISOString())
      .limit(5000)

    if (error) {
      return NextResponse.json({ data: null, answer: 'I cannot find that information right now. Try asking about sales, menu items, or inventory.' })
    }

    const itemCounts: Record<string, number> = {}
    for (const item of (items || []) as Array<{ quantity: number; menu_item: { name: string } | Array<{ name: string }> }>) {
      const name = Array.isArray(item.menu_item) ? item.menu_item[0]?.name : item.menu_item?.name
      if (name) {
        itemCounts[name] = (itemCounts[name] || 0) + (item.quantity || 0)
      }
    }

    const sorted = Object.entries(itemCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, totalOrdered]) => ({ name, total_ordered: totalOrdered }))

    const answer = 'Most popular menu items by quantity ordered:\n' + sorted.map((s, i) => `${i + 1}. ${s.name}: ${s.total_ordered}`).join('\n')

    return NextResponse.json({
      data: sorted,
      answer,
      sql: `SELECT mi.name, SUM(oi.quantity) as total_ordered FROM order_items oi JOIN menu_items mi ON mi.id = oi.menu_item_id JOIN orders o ON o.id = oi.order_id WHERE mi.restaurant_id = '${restaurant_id}' AND o.status IN ('paid', 'completed') GROUP BY mi.name ORDER BY total_ordered DESC LIMIT 5`,
    })
  }

  if (lowerQuery.includes('profitable item') || lowerQuery.includes('top revenue') || lowerQuery.includes('highest revenue')) {
    const { data: items, error } = await supabase
      .from('order_items')
      .select('subtotal, menu_item:menu_item_id(name)')
      .limit(5000)

    if (error) {
      return NextResponse.json({ data: null, answer: 'I cannot find that information right now. Try asking about sales, menu items, or inventory.' })
    }

    const itemRevenue: Record<string, number> = {}
    for (const item of (items || []) as Array<{ subtotal: number; menu_item: { name: string } | Array<{ name: string }> }>) {
      const name = Array.isArray(item.menu_item) ? item.menu_item[0]?.name : item.menu_item?.name
      if (name) {
        itemRevenue[name] = (itemRevenue[name] || 0) + Number(item.subtotal || 0)
      }
    }

    const sorted = Object.entries(itemRevenue)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, revenue]) => ({ name, revenue }))

    const answer = 'Menu items generating the most revenue:\n' + sorted.map((s, i) => `${i + 1}. ${s.name}: ETB ${s.revenue.toLocaleString()}`).join('\n')

    return NextResponse.json({
      data: sorted,
      answer,
      sql: `SELECT mi.name, SUM(oi.subtotal) as revenue FROM order_items oi JOIN menu_items mi ON mi.id = oi.menu_item_id JOIN orders o ON o.id = oi.order_id WHERE mi.restaurant_id = '${restaurant_id}' AND o.status IN ('paid', 'completed') GROUP BY mi.name ORDER BY revenue DESC LIMIT 5`,
    })
  }

  if (lowerQuery.includes('low stock') || lowerQuery.includes('replenish') || lowerQuery.includes('inventory')) {
    const { data: items, error } = await supabase
      .from('stock_items')
      .select('current_quantity, reorder_level, ingredient:ingredient_id(name)')
      .eq('restaurant_id', restaurant_id)

    if (error) {
      return NextResponse.json({ data: null, answer: 'I cannot find that information right now. Try asking about sales, menu items, or inventory.' })
    }

    const lowStock = (items || []).filter(
      (r: { current_quantity: number; reorder_level: number }) => Number(r.current_quantity) <= Number(r.reorder_level)
    ).sort((a: { current_quantity: number }, b: { current_quantity: number }) => Number(a.current_quantity) - Number(b.current_quantity))

    const mapped = lowStock.map((r: { current_quantity: number; reorder_level: number; ingredient: { name: string } | Array<{ name: string }> }) => ({
      name: Array.isArray(r.ingredient) ? r.ingredient[0]?.name : r.ingredient?.name,
      current_quantity: r.current_quantity,
      reorder_level: r.reorder_level,
    })).filter((r): r is { name: string; current_quantity: number; reorder_level: number } => r.name !== undefined)
    
    let answer: string
    if (mapped.length === 0) {
      answer = 'All ingredients are adequately stocked.'
    } else {
      answer = 'Ingredients needing replenishment:\n' + mapped.map((r: { name: string; current_quantity: number; reorder_level: number }) =>
        `${r.name}: ${r.current_quantity} remaining (min: ${r.reorder_level})`
      ).join('\n')
    }

    return NextResponse.json({
      data: lowStock,
      answer,
      sql: `SELECT i.name, si.current_quantity, si.reorder_level FROM stock_items si JOIN ingredients i ON i.id = si.ingredient_id WHERE si.restaurant_id = '${restaurant_id}' AND si.current_quantity <= si.reorder_level ORDER BY si.current_quantity ASC`,
    })
  }

  if (lowerQuery.includes('best waiter') || lowerQuery.includes('top waiter') || lowerQuery.includes('waiter performance')) {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('employee:created_by(full_name)')
      .eq('restaurant_id', restaurant_id)
      .gte('created_at', todayISO)
      .in('status', ['paid', 'completed'])

    if (error) {
      return NextResponse.json({ data: null, answer: 'I cannot find that information right now. Try asking about sales, menu items, or inventory.' })
    }

    const waiterCounts: Record<string, number> = {}
    for (const order of (orders || []) as Array<{ employee: { full_name: string } | Array<{ full_name: string }> }>) {
      const name = Array.isArray(order.employee) ? order.employee[0]?.full_name : order.employee?.full_name
      if (name) {
        waiterCounts[name] = (waiterCounts[name] || 0) + 1
      }
    }

    const sorted = Object.entries(waiterCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([full_name, ordersServed]) => ({ full_name, orders_served: ordersServed }))

    const answer = 'Waiters with the most orders served today:\n' + sorted.map((s, i) => `${i + 1}. ${s.full_name}: ${s.orders_served} orders`).join('\n')

    return NextResponse.json({
      data: sorted,
      answer,
      sql: `SELECT e.full_name, COUNT(*) as orders_served FROM orders o JOIN employees e ON e.id = o.created_by WHERE o.restaurant_id = '${restaurant_id}' AND o.status IN ('paid', 'completed') AND DATE(o.created_at) = CURRENT_DATE GROUP BY e.full_name ORDER BY orders_served DESC LIMIT 5`,
    })
  }

  if (lowerQuery.includes('table utilization') || lowerQuery.includes('table status') || lowerQuery.includes('table')) {
    const { data: tables, error } = await supabase
      .from('tables')
      .select('table_number, status')
      .eq('restaurant_id', restaurant_id)
      .order('table_number')

    if (error) {
      return NextResponse.json({ data: null, answer: 'I cannot find that information right now. Try asking about sales, menu items, or inventory.' })
    }

    const answer = 'Current status of all tables:\n' + (tables || []).map((t: { table_number: string; status: string }) => `Table ${t.table_number}: ${t.status}`).join('\n')

    return NextResponse.json({
      data: tables,
      answer,
      sql: `SELECT table_number, status FROM tables WHERE restaurant_id = '${restaurant_id}' ORDER BY table_number`,
    })
  }

  // Fallback — check for generic keywords
  if (lowerQuery.includes('order') || lowerQuery.includes('sale')) {
    const { data: orders } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('restaurant_id', restaurant_id)
      .gte('created_at', todayISO)
      .in('status', ['paid', 'completed'])

    const rows = orders || []
    const total = rows.reduce((sum: number, r: { total_amount: number }) => sum + Number(r.total_amount || 0), 0)
    const count = rows.length
    const answer = `Today's sales: ETB ${total.toLocaleString()} from ${count} orders.`

    return NextResponse.json({
      data: orders,
      answer,
      sql: `SELECT SUM(total_amount) as revenue, COUNT(*) as orders FROM orders WHERE restaurant_id = '${restaurant_id}' AND DATE(created_at) = CURRENT_DATE AND status IN ('paid', 'completed')`,
    })
  }

  if (lowerQuery.includes('stock') || lowerQuery.includes('inventory') || lowerQuery.includes('replenish')) {
    const { data: items } = await supabase
      .from('stock_items')
      .select('current_quantity, reorder_level, ingredient:ingredient_id(name)')
      .eq('restaurant_id', restaurant_id)

    const lowStock = (items || []).filter(
      (r: { current_quantity: number; reorder_level: number }) => Number(r.current_quantity) <= Number(r.reorder_level)
    )

    const mapped = lowStock.map((r: { current_quantity: number; reorder_level: number; ingredient: { name: string } | Array<{ name: string }> }) => ({
      name: Array.isArray(r.ingredient) ? r.ingredient[0]?.name : r.ingredient?.name,
      current_quantity: r.current_quantity,
      reorder_level: r.reorder_level,
    })).filter((r): r is { name: string; current_quantity: number; reorder_level: number } => r.name !== undefined)

    const answer = mapped.length === 0
      ? 'All ingredients are adequately stocked.'
      : 'Ingredients needing replenishment:\n' + mapped.map((r: { name: string; current_quantity: number; reorder_level: number }) =>
          `${r.name}: ${r.current_quantity} remaining (min: ${r.reorder_level})`
        ).join('\n')

    return NextResponse.json({ data: lowStock, answer })
  }

  return NextResponse.json({
    data: null,
    answer: 'I can help with questions about: today\'s sales, monthly revenue, popular items, profitable items, low stock alerts, waiter performance, and table status. Please rephrase your question.',
  })
}
