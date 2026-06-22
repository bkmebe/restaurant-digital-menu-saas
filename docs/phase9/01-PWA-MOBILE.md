# Phase 9: Mobile Experience (PWA)

## Progressive Web App

### manifest.json
```json
{
  "name": "Restaurant Digital Menu",
  "short_name": "RDM",
  "description": "Digital menu and ordering system",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-192-maskable.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### Service Worker (sw.js)
- Cache static assets on install
- Network-first strategy for API calls
- Cache menu data for offline browsing
- Background sync for offline orders

## Offline Support

### Strategy
1. **Menu pages**: Cache on first visit, serve from cache offline
2. **Order submission**: Queue in IndexedDB, submit when online
3. **Service requests**: Queue and retry
4. **Static assets**: Pre-cached on service worker install

### Implementation
```typescript
// Offline order queue
interface OfflineOrder {
  id: string
  data: OrderFormData
  created_at: string
  retry_count: number
}

// Store in IndexedDB when offline
// Sync when connectivity returns
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
  navigator.serviceWorker.ready.then(registration => {
    return registration.sync.register('sync-orders')
  })
}
```

## Push Notifications
- Kitchen: New order notification
- Waiter: Service request notification
- Customer: Order status update
- Admin: Low stock alert

## Performance Optimization for Ethiopian Networks

### Techniques
1. **Code splitting**: Route-based chunks (Next.js default)
2. **Image optimization**: next/image with WebP format
3. **Font subsetting**: Only load needed characters
4. **Bundle size**: < 100KB initial JS (target)
5. **Lazy loading**: Components below the fold
6. **Prefetching**: Preload menu data on QR scan
7. **Connection-aware loading**: Detect slow connections (Navigator.connection)

### Network Resilience
- Retry with exponential backoff for failed API calls
- Timeout: 10s for API, 30s for payments
- Offline indicator when no connectivity
- Queue service requests when offline

## PWA Configuration Files

### next.config.ts additions
```typescript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    { urlPattern: /\/api\//, handler: 'NetworkFirst' },
    { urlPattern: /\/menu\//, handler: 'StaleWhileRevalidate' },
    { urlPattern: /\.(png|jpg|webp|svg)$/, handler: 'CacheFirst' },
  ],
})
```

### Mobile-specific UI Optimizations
- Bottom navigation for mobile
- Touch-friendly buttons (min 44px)
- Pull-to-refresh for order status
- Swipe to dismiss cart drawer
- Viewport meta: width=device-width, initial-scale=1
