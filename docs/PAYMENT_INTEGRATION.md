# Ethiopian Payment Integration Strategy

## Overview
The system supports Ethiopian-specific payment methods. Since direct API access to Ethiopian financial institutions requires business registration and formal agreements, the initial implementation uses a **payment info display + deep link** approach.

## Supported Payment Methods

### 1. Telebirr (Ethio telecom)
- **Type**: Mobile money
- **Coverage**: 40M+ users
- **Implementation**: Display Telebirr account number + QR code
- **Deep link**: `telebirr://pay?merchant={id}&amount={amount}`
- **Configuration**: Admin enters merchant phone number and account name

### 2. CBE Birr (Commercial Bank of Ethiopia)
- **Type**: Mobile banking
- **Coverage**: 15M+ users
- **Implementation**: Display CBE Birr account number + QR code
- **Deep link**: `cbebirr://pay?merchant={id}&amount={amount}`
- **Configuration**: Admin enters CBE Birr phone/account number

### 3. Bank Transfers (Commercial Bank of Ethiopia)
- **Type**: Bank transfer
- **Fields**: Account name, account number, branch
- **Implementation**: Display bank details on payment page

### 4. Bank Transfers (Dashen Bank)
- **Type**: Bank transfer
- **Fields**: Account name, account number, branch
- **Implementation**: Display bank details on payment page

### 5. Bank Transfers (Awash Bank)
- **Type**: Bank transfer
- **Fields**: Account name, account number, branch
- **Implementation**: Display bank details on payment page

### 6. QR Code Payments
- **Type**: Unified QR (Ethiopian standard)
- **Implementation**: Display restaurant QR code for any mobile payment app
- **Configuration**: Admin uploads QR image

## Implementation Approach

### Phase 1: Payment Information Display (MVP)
```
Customer clicks "View Payment Methods"
  → Sees list of configured payment options
  → Each option shows:
    - Provider logo and name
    - Account number/phone number (masked partially)
    - QR code (if available)
    - "Pay Now" button → opens deep link or copies account number
```

### Phase 2: Payment Links (Post-MVP)
- Integration with Chapa, YenePay, or other Ethiopian payment gateways
- Generate unique payment links per order
- Webhook callbacks for payment confirmation
- Automatic order status update on payment confirmation

### Phase 3: Direct API Integration (Post-MVP)
- Direct Telebirr Merchant API integration
- Direct CBE Birr API integration
- Requires:
  - Business license
  - Merchant account registration
  - API key from respective provider
  - Compliance with NBE (National Bank of Ethiopia) regulations

## Payment Data Model
```typescript
interface PaymentConfig {
  id: string;
  restaurant_id: string;
  provider: 'telebirr' | 'cbe_birr' | 'bank' | 'qr';
  label: string;
  account_name: string;
  account_number: string;     // Encrypted at rest
  qr_image_url: string | null;
  payment_link: string | null;
  bank_name: string | null;    // For bank transfers
  is_active: boolean;
  sort_order: number;
}
```

## Security Considerations
- Account numbers stored encrypted at rest
- Masked display (last 4 digits visible)
- No payment data enters our system in Phase 1
- All payment transactions happen on provider platforms
- PCI DSS compliance handled by payment providers

## User Flow
```
1. Customer views bill amount
2. Taps "Pay Now" or "Payment Methods"
3. Sees available options:
   [Telebirr] [CBE Birr] [Bank Transfer]
4. Selects method → sees details:
   - Account: 0911XXXXXX
   - QR Code
   - "Open Telebirr" button
5. Customer pays directly on provider's platform
6. Customer notifies waiter (manual confirmation)
7. Waiter/Cashier marks order as paid
```

## Future API Integration (Phase 3+)
| Provider    | API Type     | Status  | Documentation                     |
|-------------|-------------|---------|-----------------------------------|
| Telebirr    | REST API    | Planned | Via Ethio telecom merchant portal |
| CBE Birr    | REST API    | Planned | Via CBE merchant services        |
| Chapa       | REST API    | Planned | docs.chapa.co                     |
| YenePay     | REST API    | Planned | yenepay.com/documentation        |
