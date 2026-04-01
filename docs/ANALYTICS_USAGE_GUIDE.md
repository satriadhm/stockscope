# Stockscope Analytics Usage Guide

## Installation

The analytics library is already included in the project. No external dependencies required beyond `uuid` (already installed).

## Quick Start

### 1. Initialize Tracker (App Root)

Add to your root layout component:

```typescript
// app/layout.tsx
'use client'

import { usePageTracking, useIdentifyUser } from '@/lib/analytics'
import { useSession } from 'next-auth/react'

export default function RootLayout({ children }) {
  const { data: session } = useSession()
  
  // Auto-track page views
  usePageTracking()
  
  // Identify user after login
  useIdentifyUser(session?.user?.id)
  
  return <html>{children}</html>
}
```

### 2. Track Custom Events

```typescript
// Any React component
import { useTrackEvent } from '@/lib/analytics'

export function ScreenerFilters() {
  const trackFilterApplied = useTrackEvent('screener_filter_applied')
  
  const handleFilterChange = (filterType: string, value: any) => {
    // Your filter logic here
    applyFilter(filterType, value)
    
    // Track the event
    trackFilterApplied({
      filterType,
      filterValue: value,
      resultCount: getResultCount()
    })
  }
  
  return <div>...</div>
}
```

### 3. Track Button Clicks

```typescript
import { useAnalytics } from '@/lib/analytics'

export function UpgradeButton() {
  const tracker = useAnalytics()
  
  return (
    <button 
      onClick={() => {
        tracker.track('upgrade_button_clicked', {
          source: 'screener_header',
          plan: 'pro'
        })
        // Navigate to upgrade page
      }}
    >
      Upgrade to Pro
    </button>
  )
}
```

### 4. Track Watchlist Actions

```typescript
import { useTrackEvent } from '@/lib/analytics'

export function WatchlistManager() {
  const trackStockAdded = useTrackEvent('watchlist_stock_added')
  const trackWatchlistCreated = useTrackEvent('watchlist_created')
  
  const addToWatchlist = async (ticker: string, watchlistId: string) => {
    await api.addToWatchlist(watchlistId, ticker)
    
    trackStockAdded({
      ticker,
      watchlistId,
      watchlistName: getWatchlistName(watchlistId)
    })
  }
  
  return <div>...</div>
}
```

### 5. Track Search

```typescript
import { useAnalytics } from '@/lib/analytics'

export function StockSearch() {
  const tracker = useAnalytics()
  const [query, setQuery] = useState('')
  
  const handleSearch = (searchTerm: string) => {
    setQuery(searchTerm)
    
    tracker.track('search_query_entered', {
      query: searchTerm,
      queryLength: searchTerm.length
    })
  }
  
  const handleResultClick = (ticker: string, position: number) => {
    tracker.track('search_result_clicked', {
      query,
      ticker,
      position,
      resultCount: getResultCount()
    })
  }
  
  return <div>...</div>
}
```

### 6. Track Payment Events

```typescript
import { useTrackEvent } from '@/lib/analytics'

export function CheckoutPage() {
  const trackCheckout = useTrackEvent('payment_checkout_initiated')
  const trackMethodSelected = useTrackEvent('payment_method_selected')
  const trackCompleted = useTrackEvent('payment_completed')
  
  const initiateCheckout = (plan: string) => {
    trackCheckout({
      plan,
      amount: getPlanPrice(plan),
      currency: 'IDR'
    })
  }
  
  const selectPaymentMethod = (method: string) => {
    trackMethodSelected({
      method, // 'credit_card', 'bank_transfer', 'e_wallet'
      plan: selectedPlan
    })
  }
  
  const completePayment = (transactionId: string) => {
    trackCompleted({
      transactionId,
      plan: selectedPlan,
      amount: totalAmount,
      currency: 'IDR'
    })
  }
  
  return <div>...</div>
}
```

### 7. Track Errors

```typescript
import { useAnalytics } from '@/lib/analytics'

export function useErrorTracking() {
  const tracker = useAnalytics()
  
  const trackError = (error: Error, context?: string) => {
    tracker.track('error_occurred', {
      errorMessage: error.message,
      errorStack: error.stack,
      context,
      userAgent: navigator.userAgent
    })
  }
  
  return { trackError }
}

// Usage in component
function MyComponent() {
  const { trackError } = useErrorTracking()
  
  useEffect(() => {
    try {
      // Some risky operation
    } catch (error) {
      trackError(error as Error, 'data_loading')
    }
  }, [])
}
```

## Available Events

All 47 events from Event Taxonomy V1:

### Session
- `session_start` - Auto-tracked
- `session_end` - Auto-tracked on page unload

### Page
- `page_view` - Use `usePageTracking()` hook

### Auth
- `auth_signin_clicked`
- `auth_signin_completed` 
- `auth_signup_completed`
- `auth_signout_clicked`

### Screener
- `screener_viewed`
- `screener_filter_applied`
- `screener_filter_cleared`
- `screener_sort_changed`
- `screener_view_toggled`
- `screener_stock_clicked`
- `screener_export_clicked`

### Stock Detail
- `stock_detail_viewed`
- `stock_chart_timeframe_changed`
- `stock_ownership_viewed`

### Watchlist
- `watchlist_viewed`
- `watchlist_created`
- `watchlist_stock_added`
- `watchlist_stock_removed`
- `watchlist_reordered`
- `watchlist_deleted`

### Saved Screeners
- `saved_screener_created`
- `saved_screener_loaded`
- `saved_screener_deleted`

### Alerts
- `alert_created`
- `alert_deleted`
- `alert_triggered`

### Payment
- `payment_checkout_initiated`
- `payment_method_selected`
- `payment_completed`
- `payment_failed`
- `subscription_cancelled`

### Upgrade/Paywall
- `upgrade_modal_viewed`
- `upgrade_button_clicked`
- `feature_locked_viewed`

### Search
- `search_query_entered`
- `search_result_clicked`

### Error
- `error_occurred`
- `api_error`

## Configuration

```typescript
import { getTracker } from '@/lib/analytics'

const tracker = getTracker({
  endpoint: '/api/events/track',  // API endpoint
  batchSize: 10,                  // Events before auto-flush
  batchInterval: 30000,           // Flush interval (ms)
  debug: process.env.NODE_ENV === 'development'
})
```

## How It Works

1. **Session Management**: Auto-generates session ID (30-minute expiry)
2. **Anonymous Tracking**: Persistent anonymous ID across sessions
3. **User Identification**: Links anonymous → authenticated user on login
4. **Auto-Capture**: Viewport, device type, locale, UTM params, referrer
5. **Batch Upload**: Queues events, sends in batches every 30s or 10 events
6. **Graceful Shutdown**: Flushes pending events on page unload

## Best Practices

1. **Always provide properties**: Rich event data enables better analysis
   ```typescript
   // Good ✅
   tracker.track('screener_filter_applied', {
     filterType: 'price',
     filterValue: { min: 1000, max: 5000 },
     resultCount: 47
   })
   
   // Bad ❌
   tracker.track('screener_filter_applied')
   ```

2. **Track user intent, not just actions**:
   ```typescript
   // Track when user clicks "Add to Watchlist"
   tracker.track('watchlist_stock_added', { ticker, watchlistId })
   
   // Also track when they view the dropdown
   tracker.track('watchlist_viewed', { context: 'add_stock_modal' })
   ```

3. **Include context for conversion analysis**:
   ```typescript
   tracker.track('payment_completed', {
     plan: 'pro',
     amount: 99000,
     currency: 'IDR',
     source: 'screener_paywall', // Where they upgraded from
     previousAttempts: 2          // Number of prior checkout attempts
   })
   ```

4. **Don't track PII**: Never send passwords, credit card numbers, or sensitive personal data

## Debugging

Enable debug mode to see events in console:

```typescript
const tracker = getTracker({ debug: true })

// Console output:
// [Tracker] Event queued: screener_filter_applied { filterType: 'price' }
// [Tracker] Flushing 10 events
// [Tracker] Events sent successfully
```

## Manual Flush

Force send pending events immediately:

```typescript
const tracker = useAnalytics()

// Before critical navigation
const navigateAway = async () => {
  tracker.flush() // Send events now
  await router.push('/new-page')
}
```

## Server-Side Tracking

For server-side events (webhooks, cron jobs), use the API directly:

```typescript
// Backend webhook handler
await fetch('http://localhost:3000/api/events/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    eventName: 'alert_triggered',
    sessionId: 'server-cron-job',
    userId: user.id,
    properties: {
      ticker: 'BBCA',
      alertType: 'price_above',
      targetPrice: 8000,
      currentPrice: 8100
    }
  })
})
```

## TypeScript Support

Full type safety with Event Taxonomy V1:

```typescript
import { EventName } from '@/lib/analytics'

// ✅ Type-safe event names
const validEvent: EventName = 'screener_filter_applied'

// ❌ TypeScript error
const invalidEvent: EventName = 'invalid_event_name'
```

## Testing

Mock tracker in tests:

```typescript
// __mocks__/analytics.ts
export const mockTracker = {
  track: jest.fn(),
  identify: jest.fn(),
  reset: jest.fn(),
  flush: jest.fn()
}

export const getTracker = () => mockTracker
```

---

**Need Help?** Check `docs/SP4-01-EVENT-INGESTION-API.md` for API documentation.
