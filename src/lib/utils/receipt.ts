import type { Order, OrderItem, Restaurant } from '@/types/database'

interface ReceiptRenderInput {
  order: Order & { items?: (OrderItem & { menu_item?: { name: string; price: number } })[], table?: { table_number: number } }
  restaurant: Restaurant
  receiptNumber: string
  paymentMethod: string
  paymentReference?: string | null
}

interface ReceiptRenderOutput {
  receipt_data: Record<string, unknown>
  receipt_text: string
  receipt_html: string
  qr_code_data: string
}

function formatCurrency(amount: number, currency: string = 'ETB'): string {
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function generateThermalText(input: ReceiptRenderInput): string {
  const { order, restaurant, receiptNumber, paymentMethod, paymentReference } = input
  const items = order.items || []
  const line = '='.repeat(32)
  const thin = '-'.repeat(32)

  const lines: string[] = []
  lines.push(line)
  lines.push('           RESTAURANT RECEIPT')
  lines.push(line)
  lines.push('')
  lines.push(restaurant.name.toUpperCase())
  if (restaurant.address) lines.push(restaurant.address)
  if (restaurant.phone) lines.push(`Tel: ${restaurant.phone}`)
  if (restaurant.email) lines.push(`Email: ${restaurant.email}`)
  lines.push('')
  lines.push(thin)
  lines.push(`Receipt #   : ${receiptNumber}`)
  lines.push(`Date        : ${formatDateTime(order.created_at)}`)
  if (order.table?.table_number) lines.push(`Table       : #${order.table.table_number}`)
  if (order.customer_name) lines.push(`Customer    : ${order.customer_name}`)
  lines.push(thin)
  lines.push('')
  lines.push('  ITEM                     QTY   AMOUNT')
  lines.push(thin)
  for (const item of items) {
    const name = item.menu_item?.name || `Item #${item.menu_item_id?.slice(0, 8)}`
    const qty = String(item.quantity)
    const amount = formatCurrency(item.subtotal, '')
    lines.push(`  ${name.padEnd(24)} ${qty.padStart(3)}  ${amount.padStart(8)}`)
    if (item.special_requests) {
      lines.push(`    - ${item.special_requests}`)
    }
  }
  lines.push('')
  lines.push(thin)
  lines.push(`  SUBTOTAL:          ${formatCurrency(order.total_amount / (1 + (restaurant.tax_rate || 0)), '')}`)
  lines.push(`  TAX (${((restaurant.tax_rate || 0) * 100).toFixed(0)}%):    ${formatCurrency(order.total_amount - (order.total_amount / (1 + (restaurant.tax_rate || 0))), '')}`)
  lines.push(`  TOTAL:             ${formatCurrency(order.total_amount, '')}`)
  lines.push(thin)
  lines.push(`  Payment: ${paymentMethod}`)
  if (paymentReference) lines.push(`  Ref: ${paymentReference}`)
  lines.push('')
  lines.push(line)
  lines.push('         THANK YOU FOR YOUR VISIT!')
  lines.push(line)
  lines.push('')
  lines.push(`  QR: ${receiptNumber}`)

  return lines.join('\n')
}

function generateReceiptHTML(input: ReceiptRenderInput): string {
  const { order, restaurant, receiptNumber, paymentMethod, paymentReference } = input
  const items = order.items || []
  const subtotal = order.total_amount / (1 + (restaurant.tax_rate || 0))
  const tax = order.total_amount - subtotal

  const itemsHtml = items.map(item => {
    const name = item.menu_item?.name || `Item #${item.menu_item_id?.slice(0, 8)}`
    const requests = item.special_requests
      ? `<p style="margin:0;font-size:11px;color:#666;padding-left:12px">${item.special_requests}</p>`
      : ''
    return `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">
          <span style="font-weight:500">${name}</span>${requests}
        </td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${formatCurrency(item.subtotal, restaurant.currency || 'ETB')}</td>
      </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${receiptNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.5; color: #222; }
    .receipt { max-width: 300px; margin: 0 auto; padding: 16px; }
    .header { text-align: center; margin-bottom: 12px; }
    .header h1 { font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    .header p { font-size: 11px; color: #555; margin-top: 2px; }
    .divider { border: none; border-top: 1px dashed #999; margin: 8px 0; }
    .meta { font-size: 11px; margin-bottom: 8px; }
    .meta span { display: block; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th { padding: 6px 8px; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #222; text-align: left; }
    th:last-child, td:last-child { text-align: right; }
    .totals { margin-top: 4px; }
    .totals p { display: flex; justify-content: space-between; padding: 2px 8px; font-size: 12px; }
    .totals .grand { font-weight: 700; font-size: 14px; border-top: 2px solid #222; padding-top: 4px; margin-top: 4px; }
    .payment { text-align: center; font-size: 11px; margin-top: 8px; padding: 6px; background: #f5f5f5; border-radius: 4px; }
    .footer { text-align: center; margin-top: 12px; }
    .footer p { font-size: 12px; font-weight: 500; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>${restaurant.name}</h1>
      ${restaurant.address ? `<p>${restaurant.address}</p>` : ''}
      ${restaurant.phone ? `<p>${restaurant.phone}</p>` : ''}
      ${restaurant.email ? `<p>${restaurant.email}</p>` : ''}
    </div>
    <hr class="divider">
    <div class="meta">
      <span><strong>Receipt #:</strong> ${receiptNumber}</span>
      <span><strong>Date:</strong> ${formatDateTime(order.created_at)}</span>
      ${order.table?.table_number ? `<span><strong>Table:</strong> #${order.table.table_number}</span>` : ''}
      ${order.customer_name ? `<span><strong>Customer:</strong> ${order.customer_name}</span>` : ''}
    </div>
    <hr class="divider">
    <table>
      <thead>
        <tr><th style="text-align:left">Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Amount</th></tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <hr class="divider">
    <div class="totals">
      <p><span>Subtotal</span><span>${formatCurrency(subtotal, restaurant.currency || 'ETB')}</span></p>
      <p><span>Tax (${((restaurant.tax_rate || 0) * 100).toFixed(0)}%)</span><span>${formatCurrency(tax, restaurant.currency || 'ETB')}</span></p>
      <p class="grand"><span>Total</span><span>${formatCurrency(order.total_amount, restaurant.currency || 'ETB')}</span></p>
    </div>
    <div class="payment">
      <strong>${paymentMethod}</strong>
      ${paymentReference ? `<br>Ref: ${paymentReference}` : ''}
    </div>
    <hr class="divider">
    <div class="footer">
      <p>THANK YOU FOR YOUR VISIT!</p>
      <p style="font-size:10px;color:#999;margin-top:4px">${receiptNumber}</p>
    </div>
  </div>
</body>
</html>`
}

export function formatReceipt(input: ReceiptRenderInput): ReceiptRenderOutput {
  const { order, restaurant, receiptNumber, paymentMethod } = input
  const items = order.items || []

  const receiptData: Record<string, unknown> = {
    restaurant_name: restaurant.name,
    restaurant_address: restaurant.address,
    restaurant_phone: restaurant.phone,
    restaurant_email: restaurant.email,
    restaurant_tax_rate: restaurant.tax_rate,
    restaurant_logo_url: restaurant.logo_url,
    customer_name: order.customer_name,
    table_number: order.table?.table_number || null,
    items: items.map(item => ({
      name: item.menu_item?.name || '',
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
      special_requests: item.special_requests,
    })),
    subtotal: order.total_amount / (1 + (restaurant.tax_rate || 0)),
    tax_rate: restaurant.tax_rate,
    tax_amount: order.total_amount - (order.total_amount / (1 + (restaurant.tax_rate || 0))),
    total: order.total_amount,
    payment_method: paymentMethod,
    payment_reference: input.paymentReference || null,
    receipt_type: 'thermal_80mm',
  }

  const receiptText = generateThermalText(input)
  const receiptHtml = generateReceiptHTML(input)
  const qrData = JSON.stringify({
    r: receiptNumber,
    o: order.id,
    a: order.total_amount,
    p: paymentMethod,
  })

  return {
    receipt_data: receiptData,
    receipt_text: receiptText,
    receipt_html: receiptHtml,
    qr_code_data: qrData,
  }
}

export type { ReceiptRenderInput, ReceiptRenderOutput }
