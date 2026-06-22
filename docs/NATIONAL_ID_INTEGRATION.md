# Ethiopian National ID Integration Strategy

## Overview
Ethiopia's national ID system (Fayda ID /  ፋይዳ) is a digital identity program managed by the National ID Program (NIDP). This document outlines how the restaurant management system integrates national ID for employee verification.

## Current Context (2026)
- **Fayda ID**: Ethiopia's national digital ID system, rolling out nationwide
- **Coverage**: Growing coverage, targeting universal coverage
- **API Access**: Limited to authorized entities (banks, telecoms, government)
- **For SMEs**: Direct API access may not be immediately available

## Implementation Strategy

### Phase 1: Manual Entry & Verification (MVP)
```
Employee Registration:
  1. Admin enters employee details
  2. National ID field: text input for ID number
  3. Photo upload of national ID card (front + back)
  4. Admin manually verifies against physical ID
  5. Status: verified / unverified / pending
```

### Phase 2: ID Validation (Post-MVP)
- Format validation (Fayda ID follows ISO/IEC 18013-5 standards)
- Check digit validation
- Date format verification
- Duplicate ID detection across the restaurant

### Phase 3: API Integration (Future)
- Direct Fayda ID API for instant verification
- Biometric verification support
- Real-time identity validation
- Requires:
  - Partnership/registration with NIDP
  - KYC compliance
  - Data protection agreement

## Data Model
```typescript
interface Employee {
  // ... other fields
  national_id: string;              // Fayda ID number
  national_id_verified: boolean;    // Verification status
  national_id_front_url: string;    // Front photo (storage)
  national_id_back_url: string;     // Back photo (storage)
  national_id_verified_at: string;  // Verification timestamp
  national_id_verified_by: string;  // Admin who verified
}
```

## Security & Privacy
- National ID images stored in Supabase Storage (private bucket)
- ID numbers encrypted at rest
- Access restricted to admin role only
- Retention policy: deleted 90 days after employee termination
- Compliance with Ethiopian Data Protection Proclamation

## Employee ID Generation
Each employee also receives a **Digital Employee ID**:
```
Format: RMD-{RestaurantCode}-{Year}-{SequentialNumber}
Example: RMD-ABC-2026-0042
```
This is used for internal identification instead of national ID.
