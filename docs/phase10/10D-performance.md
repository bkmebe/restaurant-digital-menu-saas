# Phase 10D — Performance Optimization

## Bundle Size Audit

### Current State
- Next.js 16 with webpack
- 41 routes total
- All pages use `'use client'` (no RSC optimization)

### Optimization Plan

#### 1. Dynamic Imports for Heavy Components
```
recharts      ~500KB    → dynamic import in reports page
qrcode.react  ~50KB     → dynamic import in tables page
lucide-react  ~100KB    → tree-shakeable (already optimal)
```

#### 2. Image Optimization
```typescript
// Already configured in next.config.ts:
images: {
  remotePatterns: [
    { protocol: 'https', hostname: '**.supabase.co' },
    { protocol: 'https', hostname: 'api.qrserver.com' },
  ],
}
```

**Enhancement:** Add device sizes and image formats:
```typescript
images: {
  deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  formats: ['image/webp'],
  minimumCacheTTL: 86400,
}
```

#### 3. Route Performance

| Route | Current | Optimization | Target |
|-------|---------|-------------|--------|
| `/menu/[tableId]` | RSC fetch | Add prefetch, pagination | <1.5s FCP |
| `/cart` | Client-side | Add streaming | <1.5s FCP |
| `/dashboard` | Client-side | Add RSC data loading | <1.5s FCP |
| `/orders/[orderId]` | Client-side | Add ISR for static initial state | <1.5s FCP |

#### 4. Query Optimization

**Current Issues:**
- All hooks use `useEffect` + fetch pattern (no React Query caching)
- No request deduplication
- No stale-while-revalidate

**Fix:** Add @tanstack/react-query:
```bash
npm install @tanstack/react-query
```

Query client provider in layout:
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,     // 30s
      gcTime: 5 * 60_000,    // 5min
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
})
```

#### 5. PWA/Service Worker Caching

**Current:** Network-first for API, cache-first for static assets.

**Enhancement:**
- Add stale-while-revalidate for menu data (30s TTL)
- Add background sync queue for offline orders
- Precache critical pages on install

#### 6. Database Query Performance

See Phase 10F for full index audit. Critical indexes:
```sql
CREATE INDEX idx_orders_created_by ON orders(created_by);
CREATE INDEX idx_order_items_menu_item ON order_items(menu_item_id);
CREATE INDEX idx_payment_transactions_restaurant ON payment_transactions(restaurant_id);
```

#### 7. Lighthouse Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| Performance | ≥95 | Code splitting, image opt, reduce JS |
| Accessibility | ≥95 | Semantic HTML, aria labels, contrast |
| Best Practices | ≥95 | HTTPS, CSP headers, no vulnerabilities |
| SEO | ≥95 | Meta tags, sitemap, semantic structure |
| FCP | <1.5s | Preload critical CSS, minimize blocking JS |
| LCP | <2.5s | Optimize hero images, preload LCP resource |
| CLS | <0.1 | Set explicit dimensions on images, fonts |

#### 8. Execution Plan

1. Add `@tanstack/react-query` for data fetching
2. Create query provider wrapper
3. Add dynamic imports for recharts and qrcode.react
4. Update next.config image optimization
5. Enable ISR for static dashboard pages
6. Add preload hints for critical routes
7. Run Lighthouse CI before/after
