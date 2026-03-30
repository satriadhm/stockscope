# Event Taxonomy V1 - Stockscope Product Analytics

**Version:** 1.0.0  
**Status:** 🔒 FROZEN (Do not modify without version bump)  
**Created:** 2026-03-30  
**Sprint:** SP1-04 - Foundation & Instrumentation  
**Owner:** Product Manager

---

## 📐 Purpose

This document defines the **canonical event taxonomy** for Stockscope product analytics. All tracking events must conform to this schema. This taxonomy will be implemented in Sprint 4 (EPIC-04: Product Analytics).

**Goals:**
1. **Consistency:** Same event names across web, mobile, and API
2. **Discoverability:** Clear naming convention for easy querying
3. **Extensibility:** Support future features without breaking changes
4. **Privacy:** No PII in event properties

---

## 🏗️ Event Structure

Every event follows this structure:

```typescript
interface TrackingEvent {
  // Required fields
  event_name: string;              // From taxonomy below
  timestamp: string;               // ISO 8601 UTC
  session_id: string;              // Client-side session UUID
  user_id?: string;                // Logged-in user ID (null if anonymous)
  
  // Context (auto-captured)
  platform: 'web' | 'mobile_ios' | 'mobile_android';
  device_type: 'desktop' | 'tablet' | 'mobile';
  locale: 'id' | 'en';
  viewport_width: number;
  viewport_height: number;
  
  // Event-specific properties
  properties: Record<string, string | number | boolean>;
}
```

---

## 📛 Naming Convention

**Format:** `[category]_[object]_[action]`

**Examples:**
- `page_view` (special case, no object)
- `screener_filter_applied`
- `watchlist_stock_added`
- `payment_checkout_initiated`

**Rules:**
1. All lowercase with underscores
2. Past tense for completed actions (`_clicked`, `_viewed`, `_added`)
3. Present tense for ongoing actions (`_loading`, `_typing`)
4. Category first, then object, then action
5. Maximum 3 segments (exceptions: `page_view`, `session_start`)

---

## 🎯 Core Events (Required for All Platforms)

### 1. Session Events

#### `session_start`
Fired when a new session begins (first page load or app open).

**Properties:**
```typescript
{
  referrer?: string;              // HTTP referrer
  utm_source?: string;            // Marketing source
  utm_medium?: string;            // Marketing medium
  utm_campaign?: string;          // Campaign name
  is_returning_user: boolean;     // Has user visited before?
}
```

**Trigger:** First event in session, before any page view.

---

#### `session_end`
Fired when session expires (30min inactivity or explicit logout).

**Properties:**
```typescript
{
  duration_seconds: number;       // Total session duration
  page_views: number;             // Pages viewed in session
  events_count: number;           // Total events fired
}
```

**Trigger:** On logout, tab close, or inactivity timeout.

---

### 2. Page/Screen Events

#### `page_view`
Fired on every route change (SPA) or page load.

**Properties:**
```typescript
{
  page_path: string;              // e.g., "/screener"
  page_title: string;             // Document title
  previous_path?: string;         // Previous page (null if entry)
  load_time_ms?: number;          // Time to interactive (web only)
}
```

**Trigger:** On `useEffect()` mount or `componentDidMount()` for each route.

**Examples:**
- `/` → Landing page
- `/screener` → Screener page
- `/screener?sector=finance` → Screener with filters
- `/upgrade` → Pricing page

---

### 3. Authentication Events

#### `auth_signin_clicked`
User clicked the sign-in button.

**Properties:**
```typescript
{
  provider: 'google' | 'email' | 'apple';
  page_path: string;              // Where button was clicked
}
```

---

#### `auth_signin_completed`
User successfully signed in.

**Properties:**
```typescript
{
  provider: 'google' | 'email' | 'apple';
  is_new_user: boolean;           // First-time signup?
  signup_date?: string;           // ISO date if new user
}
```

---

#### `auth_signout_clicked`
User clicked sign out.

**Properties:**
```typescript
{
  session_duration_seconds: number;
}
```

---

### 4. Search & Discovery Events

#### `search_query_submitted`
User submitted a stock search query.

**Properties:**
```typescript
{
  query: string;                  // Search term (max 100 chars)
  query_length: number;           // Character count
  results_count: number;          // Number of results returned
  location: 'navbar' | 'screener' | 'dashboard';
}
```

**Note:** Log full query for analytics. Sanitize PII before storage.

---

#### `search_result_clicked`
User clicked on a search result.

**Properties:**
```typescript
{
  ticker: string;                 // Stock ticker (e.g., "BBCA")
  result_position: number;        // 1-indexed position in results
  query: string;                  // Original search query
}
```

---

### 5. Screener Events

#### `screener_filter_applied`
User applied or changed a screener filter.

**Properties:**
```typescript
{
  filter_type: string;            // e.g., "sector", "market_cap", "pe_ratio"
  filter_value: string | number;  // Selected value
  active_filters_count: number;   // Total filters applied
}
```

**Examples:**
- `filter_type: "sector"`, `filter_value: "finance"`
- `filter_type: "market_cap"`, `filter_value: ">1000000000"`

---

#### `screener_filter_cleared`
User cleared all filters or reset screener.

**Properties:**
```typescript
{
  filters_cleared_count: number;  // How many filters were active
}
```

---

#### `screener_sort_changed`
User changed the sort order of results.

**Properties:**
```typescript
{
  sort_field: string;             // e.g., "market_cap", "price", "volume"
  sort_direction: 'asc' | 'desc';
}
```

---

#### `screener_result_clicked`
User clicked on a stock in the screener results.

**Properties:**
```typescript
{
  ticker: string;                 // Stock ticker
  result_position: number;        // 1-indexed position
  active_filters_count: number;   // How many filters were active
  total_results: number;          // Total results in view
}
```

---

#### `screener_saved`
User saved a screener configuration (Sprint 2 feature).

**Properties:**
```typescript
{
  screener_name: string;          // User-provided name
  filters_count: number;          // Number of filters saved
  is_first_save: boolean;         // First time saving a screener?
}
```

---

### 6. Watchlist Events (Sprint 2)

#### `watchlist_created`
User created a new watchlist.

**Properties:**
```typescript
{
  watchlist_name: string;         // User-provided name
  is_first_watchlist: boolean;    // First watchlist for this user?
}
```

---

#### `watchlist_stock_added`
User added a stock to a watchlist.

**Properties:**
```typescript
{
  ticker: string;                 // Stock ticker
  watchlist_id: string;           // Watchlist UUID
  source: 'screener' | 'search' | 'dashboard' | 'direct';
}
```

---

#### `watchlist_stock_removed`
User removed a stock from a watchlist.

**Properties:**
```typescript
{
  ticker: string;
  watchlist_id: string;
}
```

---

#### `watchlist_viewed`
User opened/viewed a watchlist.

**Properties:**
```typescript
{
  watchlist_id: string;
  stocks_count: number;           // Number of stocks in watchlist
}
```

---

### 7. Alert Events (Sprint 2)

#### `alert_created`
User created a price alert.

**Properties:**
```typescript
{
  ticker: string;
  alert_type: 'price_above' | 'price_below' | 'price_change_pct';
  threshold_value: number;        // Alert threshold
  notification_method: 'email' | 'push' | 'both';
}
```

---

#### `alert_triggered`
Server-side event when an alert condition is met.

**Properties:**
```typescript
{
  alert_id: string;
  ticker: string;
  alert_type: 'price_above' | 'price_below' | 'price_change_pct';
  threshold_value: number;
  actual_value: number;           // Current price/change
  user_id: string;
}
```

---

#### `alert_notification_sent`
Server-side event when alert notification is delivered.

**Properties:**
```typescript
{
  alert_id: string;
  user_id: string;
  notification_method: 'email' | 'push';
  delivery_status: 'sent' | 'failed';
}
```

---

### 8. Payment & Subscription Events

#### `payment_checkout_initiated`
User clicked "Upgrade" or started checkout flow.

**Properties:**
```typescript
{
  plan_id: string;                // e.g., "premium_monthly"
  plan_name: string;              // e.g., "Premium"
  price_idr: number;              // Price in Indonesian Rupiah
  billing_cycle: 'monthly' | 'annual';
  source: 'paywall' | 'pricing_page' | 'feature_gate';
}
```

---

#### `payment_method_selected`
User selected a payment method in checkout.

**Properties:**
```typescript
{
  payment_method: string;         // e.g., "credit_card", "gopay", "bank_transfer"
  plan_id: string;
}
```

---

#### `payment_completed`
Server-side event when payment is confirmed (webhook).

**Properties:**
```typescript
{
  transaction_id: string;         // Midtrans transaction ID
  user_id: string;
  plan_id: string;
  amount_idr: number;
  payment_method: string;
  status: 'success' | 'pending' | 'failed';
}
```

**Note:** This is a **server-side event** triggered by Midtrans webhook.

---

#### `subscription_upgraded`
User upgraded from one plan to another.

**Properties:**
```typescript
{
  from_plan: string;              // Previous plan
  to_plan: string;                // New plan
  upgrade_reason?: string;        // Optional: feature gate that triggered
}
```

---

#### `subscription_cancelled`
User cancelled their subscription.

**Properties:**
```typescript
{
  plan_id: string;
  cancellation_reason?: string;   // From exit survey
  days_subscribed: number;        // How long they were subscribed
}
```

---

### 9. Feature Usage Events

#### `feature_gated_shown`
User encountered a premium feature gate (paywall).

**Properties:**
```typescript
{
  feature_name: string;           // e.g., "hhi_analysis", "ownership_data"
  current_plan: string;           // User's current plan
  required_plan: string;          // Plan needed to unlock
  action_taken: 'dismissed' | 'upgraded' | 'none';
}
```

---

#### `export_initiated`
User initiated a data export (CSV, PDF, etc.).

**Properties:**
```typescript
{
  export_type: 'csv' | 'pdf' | 'excel';
  data_source: 'screener' | 'watchlist' | 'dashboard';
  rows_exported: number;          // Number of data rows
}
```

---

#### `dashboard_widget_clicked`
User interacted with a dashboard widget/card.

**Properties:**
```typescript
{
  widget_type: string;            // e.g., "top_gainers", "portfolio_summary"
  widget_position: number;        // Position in grid (1-indexed)
}
```

---

### 10. Error Events

#### `error_occurred`
Client-side or server-side error occurred.

**Properties:**
```typescript
{
  error_type: string;             // e.g., "api_error", "validation_error"
  error_message: string;          // Error message (sanitized, no PII)
  error_code?: string;            // HTTP status or app error code
  stack_trace?: string;           // First 500 chars of stack (dev only)
  page_path: string;              // Where error occurred
}
```

**Note:** Integrate with Sentry for full error details. This is for funnel analysis.

---

## 🔐 Privacy & Compliance

### PII Handling Rules

**✅ ALLOWED:**
- User IDs (hashed or UUIDs)
- Aggregated data (counts, averages)
- Stock tickers and market data
- Device/browser metadata

**❌ FORBIDDEN:**
- Email addresses
- Phone numbers
- Full names
- IP addresses (unless hashed)
- Payment card numbers
- Government IDs

**Sanitization:**
- Search queries: Review for accidental PII (e.g., searching for own name)
- Error messages: Strip file paths, credentials, tokens
- Form inputs: Never log password fields

### Data Retention

- **Raw events:** 90 days
- **Aggregated metrics:** 2 years
- **User-level data:** Deleted on account deletion (GDPR compliance)

---

## 📊 Event Priority Tiers

### Tier 1: Critical (Required for MVP)
Must be tracked from Day 1:
- `session_start`, `session_end`
- `page_view`
- `auth_signin_completed`, `auth_signout_clicked`
- `payment_completed`
- `error_occurred`

### Tier 2: High Priority (Sprint 2-3)
Core product features:
- All screener events
- All watchlist events
- Search events
- Feature gate events

### Tier 3: Nice-to-Have (Sprint 4+)
Advanced analytics:
- Dashboard widget interactions
- Export events
- Sort/filter changes
- Detailed click tracking

---

## 🧪 Validation Rules

### Event Name Validation
```typescript
const EVENT_NAME_PATTERN = /^[a-z]+(_[a-z]+){1,2}$/;

function validateEventName(name: string): boolean {
  return EVENT_NAME_PATTERN.test(name) && name.length <= 50;
}
```

### Property Validation
```typescript
interface PropertyConstraints {
  maxStringLength: 500;          // Max chars for string properties
  maxArrayLength: 50;            // Max items in array properties
  maxNestingDepth: 2;            // Max nested object depth
  allowedTypes: ['string', 'number', 'boolean', 'null'];
}
```

### Required Fields Check
```typescript
function validateEvent(event: TrackingEvent): boolean {
  return !!(
    event.event_name &&
    event.timestamp &&
    event.session_id &&
    event.platform &&
    event.locale
  );
}
```

---

## 📦 Implementation Guide (Sprint 4)

### 1. Client-Side Wrapper

```typescript
// lib/analytics.ts
import { TrackingEvent } from './types';

export function track(
  eventName: string,
  properties: Record<string, any> = {}
): void {
  if (!validateEventName(eventName)) {
    console.error(`Invalid event name: ${eventName}`);
    return;
  }

  const event: TrackingEvent = {
    event_name: eventName,
    timestamp: new Date().toISOString(),
    session_id: getSessionId(),
    user_id: getUserId() || null,
    platform: 'web',
    device_type: getDeviceType(),
    locale: getLocale(),
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    properties: sanitizeProperties(properties),
  };

  // Send to analytics API
  sendToAnalytics(event);
}
```

### 2. Server-Side Events

```typescript
// lib/analytics-server.ts
export function trackServerEvent(
  eventName: string,
  userId: string,
  properties: Record<string, any>
): void {
  const event = {
    event_name: eventName,
    timestamp: new Date().toISOString(),
    user_id: userId,
    platform: 'server',
    properties,
  };

  // Queue for async processing
  analyticsQueue.add(event);
}
```

### 3. Usage Examples

```typescript
// On search
track('search_query_submitted', {
  query: searchTerm,
  query_length: searchTerm.length,
  results_count: results.length,
  location: 'navbar',
});

// On filter change
track('screener_filter_applied', {
  filter_type: 'sector',
  filter_value: 'finance',
  active_filters_count: 3,
});

// On payment completion (server-side)
trackServerEvent('payment_completed', userId, {
  transaction_id: webhookData.transaction_id,
  plan_id: 'premium_monthly',
  amount_idr: 99000,
  payment_method: 'credit_card',
  status: 'success',
});
```

---

## 🚀 Rollout Plan

### Phase 1: Foundation (Sprint 4 - SP4-01, SP4-02)
- [ ] Create analytics API endpoint (`/api/analytics`)
- [ ] Build client-side tracking wrapper
- [ ] Implement Tier 1 events (critical)
- [ ] Setup event validation middleware

### Phase 2: Core Features (Sprint 4 - SP4-03, SP4-04)
- [ ] Add Tier 2 events (screener, search, watchlist)
- [ ] Server-side payment events via webhooks
- [ ] Session identity stitching (anonymous → logged in)

### Phase 3: Aggregation (Sprint 4 - SP4-05)
- [ ] Daily funnel aggregation job
- [ ] Conversion rate calculations
- [ ] Retention cohort analysis

---

## 📈 Key Metrics Derived from Events

### Acquisition Metrics
- **Traffic sources:** `session_start.utm_source`
- **Landing pages:** First `page_view.page_path` per session

### Activation Metrics
- **Signup rate:** `auth_signin_completed` where `is_new_user: true`
- **Time to first search:** Time between `session_start` and `search_query_submitted`

### Retention Metrics
- **DAU/MAU:** Unique `user_id` per day/month
- **Session frequency:** `session_start` count per user per week

### Monetization Metrics
- **Conversion rate:** `payment_completed` / `payment_checkout_initiated`
- **ARPU:** Sum(`payment_completed.amount_idr`) / unique users
- **Churn rate:** `subscription_cancelled` / active subscriptions

### Engagement Metrics
- **Screener usage:** `screener_filter_applied` count
- **Watchlist adoption:** `watchlist_created` / total users
- **Search activity:** `search_query_submitted` per session

---

## 🔄 Versioning & Changes

### Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2026-03-30 | Initial taxonomy | Product Manager |

### How to Request Changes

1. **Open a GitHub Issue** with label `taxonomy-change`
2. **Include:**
   - Event name or property to change
   - Reason for change
   - Impact assessment (breaking or non-breaking)
   - Migration plan if breaking
3. **Approval required from:** Product Manager + Engineering Lead
4. **Version bump:**
   - Patch (1.0.x): New optional properties
   - Minor (1.x.0): New events
   - Major (x.0.0): Breaking changes (event renames, removed properties)

---

## ✅ Checklist: Is This Taxonomy Complete?

Before freezing taxonomy v1:

- [x] All core user flows covered (auth, search, screener, payment)
- [x] Event naming follows convention consistently
- [x] Required vs optional properties documented
- [x] Privacy rules defined (no PII)
- [x] Validation rules specified
- [x] Implementation examples provided
- [x] Versioning policy established
- [x] Metrics derivation documented

**Status:** 🔒 **FROZEN FOR SPRINT 4 IMPLEMENTATION**

---

## 📚 References

- Web Analytics Best Practices: [Segment Spec](https://segment.com/docs/connections/spec/)
- Event Naming: [Amplitude Taxonomy Guide](https://amplitude.com/blog/event-taxonomy)
- GDPR Compliance: [ICO Guidelines](https://ico.org.uk/for-organisations/guide-to-data-protection/)
- Privacy by Design: [OWASP Privacy](https://owasp.org/www-project-top-ten-privacy-risks/)
