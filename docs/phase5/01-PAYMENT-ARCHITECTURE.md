# Phase 5: Ethiopian Payment Integration

## Supported Providers

### 1. Telebirr (Ethio telecom)
- **Type**: Mobile money / QR
- **Integration**: Merchant API via Telebirr Business Portal
- **API**: REST + Webhooks
- **Payment Flow**: Generate payment link → Customer pays in Telebirr app → Webhook confirms → Order updates

### 2. Chapa (chapa.co)
- **Type**: Payment gateway (cards, mobile money, bank transfer)
- **Integration**: REST API + Webhooks
- **API**: `https://api.chapa.co/v1/transaction/initialize`
- **Flow**: Initialize → Redirect → Verify → Webhook

### 3. SantimPay (santimpay.com)
- **Type**: Mobile money aggregator
- **Integration**: REST API + Webhooks
- **API**: `https://api.santimpay.com/v1/checkout`

### 4. CBE Birr
- **Type**: Mobile banking
- **Integration**: Merchant API (requires CBE partnership)
- **Current**: Display QR + account info for MVP

## Architecture
```
Customer → Payment Page → Select Provider → Initialize Payment
                                                    │
                                          Redirect to Provider App
                                                    │
                                          Customer Pays
                                                    │
                                          Provider Webhook → Verify → Update Order
                                                    │
                                          Success → Mark Order Paid
                                          Failure → Log + Notify
```

## Data Model
```sql
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  provider TEXT NOT NULL, -- telebirr, chapa, santimpay, cbe_birr
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'ETB',
  status TEXT DEFAULT 'pending',
  provider_reference TEXT, -- transaction ID from provider
  checkout_url TEXT, -- redirect URL
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ
);
```

## Webhook Security
- Verify signature using provider's secret key
- IP whitelisting for known provider IPs
- Idempotency keys to prevent double-processing
- Rate limiting on webhook endpoints
