import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAuth, requireRole } from '@/lib/utils/auth-guard'

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
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const roleError = requireRole(auth, 'manager')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const { query, restaurant_id } = await request.json()

  if (!query || !restaurant_id) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'query and restaurant_id are required' } }, { status: 400 })
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(restaurant_id)) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'Invalid restaurant_id format' } }, { status: 400 })
  }

  // For MVP, use predefined query patterns instead of LLM
  const patterns: Record<string, (rid: string) => { sql: string; explanation: string }> = {
    'today sales': (rid) => ({
      sql: `SELECT SUM(total_amount) as revenue, COUNT(*) as orders FROM orders WHERE restaurant_id = $1::uuid AND DATE(created_at) = CURRENT_DATE AND status IN ('paid', 'completed')`,
      explanation: 'Today\'s total revenue and order count',
    }),
    'month sales': (rid) => ({
      sql: `SELECT SUM(total_amount) as revenue FROM orders WHERE restaurant_id = $1::uuid AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE) AND status IN ('paid', 'completed')`,
      explanation: 'This month\'s total revenue',
    }),
    'popular item': (rid) => ({
      sql: `SELECT mi.name, SUM(oi.quantity) as total_ordered FROM order_items oi JOIN menu_items mi ON mi.id = oi.menu_item_id JOIN orders o ON o.id = oi.order_id WHERE mi.restaurant_id = $1::uuid AND o.status IN ('paid', 'completed') GROUP BY mi.name ORDER BY total_ordered DESC LIMIT 5`,
      explanation: 'Most popular menu items by quantity ordered',
    }),
    'profitable item': (rid) => ({
      sql: `SELECT mi.name, SUM(oi.subtotal) as revenue FROM order_items oi JOIN menu_items mi ON mi.id = oi.menu_item_id JOIN orders o ON o.id = oi.order_id WHERE mi.restaurant_id = $1::uuid AND o.status IN ('paid', 'completed') GROUP BY mi.name ORDER BY revenue DESC LIMIT 5`,
      explanation: 'Menu items generating the most revenue',
    }),
    'low stock': (rid) => ({
      sql: `SELECT i.name, si.current_quantity, si.reorder_level FROM stock_items si JOIN ingredients i ON i.id = si.ingredient_id WHERE si.restaurant_id = $1::uuid AND si.current_quantity <= si.reorder_level ORDER BY si.current_quantity ASC`,
      explanation: 'Ingredients that need replenishment',
    }),
    'best waiter': (rid) => ({
      sql: `SELECT e.full_name, COUNT(*) as orders_served FROM orders o JOIN employees e ON e.id = o.created_by WHERE o.restaurant_id = $1::uuid AND o.status IN ('paid', 'completed') AND DATE(o.created_at) = CURRENT_DATE GROUP BY e.full_name ORDER BY orders_served DESC LIMIT 5`,
      explanation: 'Waiters with the most orders served today',
    }),
    'table utilization': (rid) => ({
      sql: `SELECT table_number, status FROM tables WHERE restaurant_id = $1::uuid ORDER BY table_number`,
      explanation: 'Current status of all tables',
    }),
  }

  const lowerQuery = query.toLowerCase()
  let result: { sql: string; explanation: string } | null = null

  for (const [pattern, handler] of Object.entries(patterns)) {
    if (lowerQuery.includes(pattern)) {
      result = handler(restaurant_id)
      break
    }
  }

  if (!result) {
    if (lowerQuery.includes('order')) {
      const handler = patterns['today sales']
      if (handler) result = handler(restaurant_id)
    } else if (lowerQuery.includes('stock') || lowerQuery.includes('inventory') || lowerQuery.includes('replenish')) {
      const handler = patterns['low stock']
      if (handler) result = handler(restaurant_id)
    }
  }

  if (!result) {
    return NextResponse.json({
      data: null,
      answer: 'I can help with questions about: today\'s sales, monthly revenue, popular items, profitable items, low stock alerts, waiter performance, and table status. Please rephrase your question.',
    })
  }

  const { data: queryResult, error } = await supabase.rpc('exec_sql', { query_text: result.sql, param_restaurant_id: restaurant_id })

  if (error) {
    return NextResponse.json({
      data: null,
      answer: `I can't find that information right now. Try asking about sales, menu items, or inventory.`,
    })
  }

  let answer = ''
  if (lowerQuery.includes('sales') || lowerQuery.includes('revenue')) {
    const rows = Array.isArray(queryResult) ? queryResult : [queryResult]
    const total = rows.reduce((sum: number, r: Record<string, unknown>) => sum + Number(r.revenue || r.total_amount || 0), 0)
    const count = rows.reduce((sum: number, r: Record<string, unknown>) => sum + Number(r.orders || r.count || 0), 0)
    answer = `${result.explanation}: ETB ${total.toLocaleString()} from ${count} orders.`
  } else if (lowerQuery.includes('popular') || lowerQuery.includes('profitable')) {
    const rows = Array.isArray(queryResult) ? queryResult : []
    answer = `${result.explanation}:\n` + rows.slice(0, 5).map((r: Record<string, unknown>, i: number) =>
      `${i + 1}. ${r.name}: ${r.total_ordered || r.revenue}`
    ).join('\n')
  } else if (lowerQuery.includes('low stock') || lowerQuery.includes('replenish')) {
    const rows = Array.isArray(queryResult) ? queryResult : []
    if (rows.length === 0) {
      answer = 'All ingredients are adequately stocked.'
    } else {
      answer = `Ingredients needing replenishment:\n` + rows.map((r: Record<string, unknown>) =>
        `${r.name}: ${r.current_quantity} remaining (min: ${r.reorder_level})`
      ).join('\n')
    }
  } else {
    answer = result.explanation
  }

  return NextResponse.json({
    data: queryResult,
    answer,
    sql: result.sql,
  })
}
