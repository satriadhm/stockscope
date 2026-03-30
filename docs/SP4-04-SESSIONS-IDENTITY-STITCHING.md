# SP4-04: Sessions & Identity Stitching

**Sprint 4, Task 4 of 5**  
**Story Points:** 5  
**Status:** ✅ Complete

## Overview

Built session aggregation and identity stitching system that transforms raw analytics events into meaningful user sessions and links anonymous pre-login activity to authenticated users. This enables cohort analysis, user journey mapping, and accurate attribution.

## What Was Built

### 1. UserSession Model

**File:** `prisma/schema.prisma` (+52 lines)

Added comprehensive session tracking model:

```prisma
model UserSession {
  id            String   @id @default(auto()) @map("_id") @db.ObjectId
  
  // Session identification
  sessionId     String   @unique // Client session UUID
  userId        String?  @db.ObjectId // Stitched user ID
  anonymousId   String   // Original anonymous ID
  
  // Session timeline
  startTime     DateTime // First event timestamp
  endTime       DateTime? // Last event timestamp (null if ongoing)
  duration      Int?     // Duration in seconds
  
  // Session context
  platform      String
  deviceType    String
  locale        String
  
  // Entry point
  landingPage   String?
  referrer      String?
  utmSource     String?
  utmMedium     String?
  utmCampaign   String?
  utmContent    String?
  utmTerm       String?
  
  // Activity summary
  eventCount    Int      @default(0)
  pageViews     Int      @default(0)
  
  // Conversion indicators
  didSignup     Boolean  @default(false)
  didUpgrade    Boolean  @default(false)
  didPurchase   Boolean  @default(false)
  
  // Identity stitching metadata
  wasStitched   Boolean  @default(false)
  stitchedAt    DateTime?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([userId]) // For user journey analysis
  @@index([anonymousId]) // For identity stitching
  @@index([startTime]) // For time-series queries
  @@index([utmSource, utmMedium, utmCampaign]) // For attribution
  @@index([didSignup, didUpgrade, didPurchase]) // For conversion analysis
  @@map("user_sessions")
}
```

**Key Features:**
- **Unique sessionId**: Client-generated UUID, one record per session
- **Identity linking**: Both `userId` and `anonymousId` for pre/post-login tracking
- **Timeline tracking**: Start/end time and duration (seconds)
- **Entry point capture**: Landing page, referrer, full UTM params
- **Activity metrics**: Total events and page views per session
- **Conversion flags**: Quick filtering for signup, upgrade, purchase sessions
- **Stitching metadata**: Tracks when/if anonymous → auth linking occurred
- **6 strategic indexes**: Optimized for common query patterns

### 2. Session Aggregation API

**File:** `app/api/sessions/route.ts` (293 lines)

#### POST /api/sessions/aggregate
Daily cron job to aggregate raw events into sessions.

**Query Parameters:**
- `date`: ISO date to process (default: yesterday)

**Process:**
1. Get all unique sessionIds from events in date range
2. For each session:
   - Fetch all events ordered by timestamp
   - Extract first event (landing), last event (exit)
   - Determine userId (if user logged in during session)
   - Count page views and detect conversion events
   - Calculate session duration
   - Upsert UserSession record
3. Auto-detect identity stitching (anonymous session where user logged in)

**Response (200):**
```json
{
  "success": true,
  "date": "2026-03-29",
  "sessionsProcessed": 1543,
  "identitiesStitched": 87
}
```

**Example Usage:**
```bash
# Run daily aggregation (cron job at 1am)
curl -X POST "http://localhost:3000/api/sessions/aggregate"

# Backfill specific date
curl -X POST "http://localhost:3000/api/sessions/aggregate?date=2026-03-20"
```

**Server-Side Event Filtering:**
Excludes server events (webhook, cron jobs) from session aggregation:
```typescript
sessionId: {
  not: {
    startsWith: 'server-'
  }
}
```

#### PUT /api/sessions/stitch
Retroactively link anonymous events to authenticated user.

**Request Body:**
```json
{
  "userId": "6507f1f77bcf86cd799439011",
  "anonymousId": "anon-uuid-123"
}
```

**Process:**
1. Update all events with `anonymousId` to include `userId`
2. Update all sessions with `anonymousId` to link user
3. Mark sessions as `wasStitched: true` with `stitchedAt` timestamp

**Response (200):**
```json
{
  "success": true,
  "eventsUpdated": 47,
  "sessionsUpdated": 3
}
```

**Use Case:** Call this endpoint in the sign-up/sign-in flow:
```typescript
// After user signs up or logs in
const anonymousId = localStorage.getItem('stockscope_anonymous_id')
await fetch('/api/sessions/stitch', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: session.user.id,
    anonymousId
  })
})
```

#### GET /api/sessions
Query user sessions for analysis.

**Query Parameters:**
- `userId`: Filter by user ID
- `anonymousId`: Filter by anonymous ID
- `startDate`: Date range start (ISO format)
- `endDate`: Date range end (ISO format)
- `limit`: Max records (default: 100, max: 1000)

**Response (200):**
```json
{
  "success": true,
  "count": 3,
  "sessions": [
    {
      "id": "...",
      "sessionId": "uuid-session-123",
      "userId": "user-abc",
      "anonymousId": "anon-xyz",
      "startTime": "2026-03-30T08:00:00Z",
      "endTime": "2026-03-30T08:15:00Z",
      "duration": 900,
      "platform": "web",
      "deviceType": "desktop",
      "locale": "id",
      "landingPage": "/id/screener",
      "referrer": "https://google.com",
      "utmSource": "google",
      "utmMedium": "cpc",
      "utmCampaign": "q4_promo",
      "eventCount": 23,
      "pageViews": 5,
      "didSignup": false,
      "didUpgrade": true,
      "didPurchase": true,
      "wasStitched": true,
      "stitchedAt": "2026-03-30T08:05:00Z"
    }
  ]
}
```

**Example Queries:**
```bash
# Get all sessions for a user
curl "http://localhost:3000/api/sessions?userId=user-abc&limit=100"

# Get sessions from specific campaign
curl "http://localhost:3000/api/sessions?startDate=2026-03-01&endDate=2026-03-31&limit=1000"

# Debug anonymous user journey
curl "http://localhost:3000/api/sessions?anonymousId=anon-xyz"
```

## Identity Stitching Flow

### Scenario: User browses anonymously, then signs up

```
Timeline:

1. User lands on site (anonymous)
   └─> Event: session_start
       sessionId: session-123
       anonymousId: anon-xyz
       userId: null

2. User browses screener (anonymous)
   └─> Events: page_view, screener_viewed, screener_filter_applied
       All events: sessionId=session-123, anonymousId=anon-xyz, userId=null

3. User clicks "Sign Up"
   └─> Event: auth_signup_completed
       sessionId: session-123
       anonymousId: anon-xyz
       userId: user-abc (now set!)

4. Client calls stitch API
   └─> PUT /api/sessions/stitch
       Body: { userId: "user-abc", anonymousId: "anon-xyz" }

5. All events updated retroactively
   └─> Events 1-3 now have: userId=user-abc
   └─> Session marked: wasStitched=true

Result: Complete pre/post-signup journey linked to user account
```

### Auto-Stitching During Aggregation

The daily aggregation job automatically detects stitching:

```typescript
// If any event in session has userId, the session gets stitched
const userId = events.find(e => e.userId)?.userId || null

// Mark as stitched if userId exists but first event was anonymous
wasStitched: userId && !firstEvent.userId ? true : false
stitchedAt: userId && !firstEvent.userId ? new Date() : null
```

No manual intervention needed if user logs in during the session!

## Use Cases

### 1. User Journey Mapping

```javascript
// Get user's complete journey
const sessions = await fetch(`/api/sessions?userId=user-abc&limit=50`)

sessions.forEach(session => {
  console.log(`Session ${session.startTime}:`)
  console.log(`  Landing: ${session.landingPage}`)
  console.log(`  Source: ${session.utmSource}/${session.utmMedium}`)
  console.log(`  Duration: ${session.duration}s`)
  console.log(`  Converted: ${session.didPurchase}`)
})
```

### 2. Conversion Funnel Analysis

```javascript
// MongoDB query: Sessions that upgraded
db.user_sessions.aggregate([
  { $match: { didUpgrade: true, didPurchase: true } },
  { $group: {
      _id: "$utmCampaign",
      count: { $sum: 1 },
      avgDuration: { $avg: "$duration" }
  }},
  { $sort: { count: -1 } }
])

// Result: Which campaigns drive the most purchases?
```

### 3. Attribution Analysis

```javascript
// First-touch attribution: Which campaign brought the user?
const firstSession = await db.user_sessions.findOne({
  userId: "user-abc"
}).sort({ startTime: 1 })

console.log({
  firstTouch: firstSession.utmCampaign,
  landingPage: firstSession.landingPage,
  convertedInSession: firstSession.didPurchase
})
```

### 4. Churn Prediction

```javascript
// Find users with declining session frequency
db.user_sessions.aggregate([
  { $match: { userId: { $exists: true } } },
  { $group: {
      _id: "$userId",
      sessionCount: { $sum: 1 },
      lastSession: { $max: "$startTime" },
      avgDuration: { $avg: "$duration" }
  }},
  { $match: {
      lastSession: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
  }}
])

// Result: Users who haven't visited in 30+ days (churn candidates)
```

## Technical Implementation Details

### Session Duration Calculation

```typescript
const duration = Math.floor(
  (lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime()) / 1000
)
```

Handles edge cases:
- Single-event sessions: duration = 0
- Long sessions: No max limit (user might keep tab open)
- Negative durations: Prevented by ordering events by timestamp

### Conversion Detection

```typescript
const didSignup = events.some(e => e.eventName === 'auth_signup_completed')
const didUpgrade = events.some(e => e.eventName === 'upgrade_button_clicked')
const didPurchase = events.some(e => e.eventName === 'payment_completed')
```

**Result:** Boolean flags for quick filtering, no need to scan all events.

### Upsert Strategy

```typescript
await prisma.userSession.upsert({
  where: { sessionId },
  update: { /* update fields */ },
  create: { /* create fields */ }
})
```

**Benefits:**
- Idempotent: Safe to re-run aggregation
- Updates ongoing sessions as new events arrive
- No duplicate session records

## Performance Considerations

### Daily Aggregation Job

For 10,000 sessions/day:
- ~10,000 DB reads (get events per session)
- ~10,000 DB writes (upsert session records)
- Estimated time: 5-10 minutes

**Optimization:** Run at low-traffic hours (1-2 AM).

### Indexes

6 indexes cover common queries:
- `userId` - User journey analysis
- `anonymousId` - Identity stitching lookups
- `startTime` - Time-series reports
- `[utmSource, utmMedium, utmCampaign]` - Attribution
- `[didSignup, didUpgrade, didPurchase]` - Conversion filtering

### Query Performance

```javascript
// Fast: Uses userId index
db.user_sessions.find({ userId: "user-abc" })

// Fast: Uses conversion index
db.user_sessions.find({ didPurchase: true })

// Fast: Uses UTM index
db.user_sessions.find({ utmSource: "google", utmMedium: "cpc" })

// Slow: No index (avoid)
db.user_sessions.find({ duration: { $gt: 300 } })
```

## Integration with Sprint 4 Tasks

**Dependencies:**
- SP4-01: Event Ingestion API (provides raw events)
- SP4-02: Client Tracking Wrapper (generates sessionId, anonymousId)
- SP4-03: Server Payment Events (provides conversion events)

**Feeds Into:**
- SP4-05: Daily Funnel Aggregation (uses session data for funnels)
- Future: Cohort analysis, retention reports, LTV prediction

## Testing Strategy

### Test Session Aggregation

```bash
# 1. Generate test events
curl -X POST http://localhost:3000/api/events/track \
  -H "Content-Type: application/json" \
  -d '{
    "eventName": "session_start",
    "sessionId": "test-session-1",
    "anonymousId": "test-anon-1",
    "timestamp": "2026-03-29T10:00:00Z"
  }'

curl -X POST http://localhost:3000/api/events/track \
  -H "Content-Type: application/json" \
  -d '{
    "eventName": "page_view",
    "sessionId": "test-session-1",
    "anonymousId": "test-anon-1",
    "timestamp": "2026-03-29T10:05:00Z"
  }'

curl -X POST http://localhost:3000/api/events/track \
  -H "Content-Type: application/json" \
  -d '{
    "eventName": "auth_signup_completed",
    "sessionId": "test-session-1",
    "anonymousId": "test-anon-1",
    "userId": "test-user-1",
    "timestamp": "2026-03-29T10:10:00Z"
  }'

# 2. Run aggregation
curl -X POST "http://localhost:3000/api/sessions/aggregate?date=2026-03-29"

# 3. Verify session created
curl "http://localhost:3000/api/sessions?sessionId=test-session-1"

# Expected: 
# - duration: 600 seconds (10 minutes)
# - eventCount: 3
# - pageViews: 1
# - didSignup: true
# - wasStitched: true (anonymous became authenticated)
```

### Test Identity Stitching

```bash
# 1. Create anonymous events
curl -X POST http://localhost:3000/api/events/track \
  -d '{ "eventName": "page_view", "sessionId": "s1", "anonymousId": "a1" }'

# 2. User signs up, stitch identity
curl -X PUT http://localhost:3000/api/sessions/stitch \
  -d '{ "userId": "u1", "anonymousId": "a1" }'

# 3. Verify events updated
db.analytics_events.find({ anonymousId: "a1" })
// All should now have userId: "u1"
```

## Next Steps (SP4-05)

Build daily funnel aggregation:
1. Define conversion funnels (landing → signup → purchase)
2. Calculate drop-off rates at each step
3. Store daily aggregates for reporting
4. Create funnel visualization API

## Success Criteria

- [x] UserSession model with comprehensive fields
- [x] POST /api/sessions/aggregate (daily aggregation)
- [x] PUT /api/sessions/stitch (manual identity linking)
- [x] GET /api/sessions (query sessions)
- [x] Auto-stitching during aggregation
- [x] Conversion flags (didSignup, didUpgrade, didPurchase)
- [x] UTM parameter capture for attribution
- [x] 6 strategic indexes for query performance
- [x] Build passes with 39 routes compiled
- [x] Documentation complete

## Files Changed

**Modified:**
- `prisma/schema.prisma` (+52 lines) - UserSession model with 6 indexes

**Created:**
- `app/api/sessions/route.ts` (293 lines) - Session aggregation and stitching

**Total:** 345 lines added

---

**Completion Date:** 2026-03-30  
**Build Status:** ✅ Passing (39 routes)  
**Branch:** sprint-1/foundation  
**Sprint 4 Progress:** 21/29 SP (72%)
