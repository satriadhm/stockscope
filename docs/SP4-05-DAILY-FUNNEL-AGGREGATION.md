# SP4-05: Daily Funnel Aggregation

**Sprint 4, Task 5 of 5**  
**Story Points:** 8  
**Status:** ✅ Complete

## Overview

Built comprehensive conversion funnel aggregation system that transforms raw analytics events into actionable funnel metrics. The system calculates daily conversion rates, identifies drop-off points, and segments by platform and marketing campaigns.

## What Was Built

### 1. ConversionFunnel Model

**File:** `prisma/schema.prisma` (+45 lines)

Added funnel metrics model for daily aggregation:

```prisma
model ConversionFunnel {
  id            String   @id @default(auto()) @map("_id") @db.ObjectId
  
  // Funnel identification
  funnelName    String   // e.g., "signup_funnel", "purchase_funnel"
  date          DateTime // Aggregation date
  
  // Funnel steps with counts
  step1Name     String
  step1Count    Int
  
  step2Name     String
  step2Count    Int
  step2Rate     Float    // Conversion rate from step 1 to 2
  
  step3Name     String?
  step3Count    Int?
  step3Rate     Float?   // Conversion rate from step 2 to 3
  
  step4Name     String?
  step4Count    Int?
  step4Rate     Float?   // Conversion rate from step 3 to 4
  
  step5Name     String?
  step5Count    Int?
  step5Rate     Float?   // Conversion rate from step 4 to 5
  
  // Overall funnel metrics
  overallRate   Float    // End-to-end conversion rate
  dropoffStep   String?  // Step with highest drop-off
  dropoffRate   Float?   // Drop-off percentage at worst step
  
  // Segmentation (optional)
  platform      String?  // "web", "mobile_ios", "mobile_android"
  utmSource     String?  // Campaign attribution
  utmMedium     String?
  utmCampaign   String?
  
  createdAt     DateTime @default(now())
  
  @@unique([funnelName, date, platform, utmSource, utmMedium, utmCampaign])
  @@index([funnelName, date]) // For time-series queries
  @@index([utmSource, utmMedium, utmCampaign]) // For attribution
  @@map("conversion_funnels")
}
```

**Key Features:**
- **Flexible steps**: Supports 2-5 step funnels
- **Per-step metrics**: Count and conversion rate at each step
- **Drop-off analysis**: Identifies worst-performing step
- **Segmentation**: Platform and UTM campaign attribution
- **Unique constraint**: Prevents duplicate funnel records per day/segment

### 2. Predefined Funnels

**File:** `app/api/funnels/route.ts` (366 lines)

#### 5 Conversion Funnels

**1. Signup Funnel (3 steps)**
```typescript
landing → signup_clicked → signup_completed
```
Measures user acquisition efficiency.

**2. Purchase Funnel (5 steps)**
```typescript
landing → upgrade_viewed → upgrade_clicked → checkout_initiated → payment_completed
```
Complete monetization funnel from landing to revenue.

**3. Watchlist Funnel (3 steps)**
```typescript
search_entered → result_clicked → stock_added
```
Stock discovery and watchlist engagement.

**4. Screener Funnel (4 steps)**
```typescript
screener_viewed → filter_applied → stock_clicked → watchlist_added
```
Screener usage to watchlist conversion.

**5. Engagement Funnel (4 steps)**
```typescript
landing → page_view → screener_used → watchlist_created
```
Overall product engagement depth.

### 3. Funnel Aggregation API

#### POST /api/funnels/aggregate
Daily cron job to calculate funnel metrics.

**Query Parameters:**
- `date`: ISO date to process (default: yesterday)
- `funnel`: Specific funnel to calculate (default: all)

**Process:**
1. For each funnel definition:
   - Calculate overall funnel (no segmentation)
   - Calculate by platform (web, mobile_ios, mobile_android)
   - Calculate by top 5 UTM campaigns
2. For each step in funnel:
   - Count unique users (by userId or anonymousId)
   - Calculate conversion rate from previous step
3. Identify highest drop-off step
4. Store aggregated metrics in database

**Response (200):**
```json
{
  "success": true,
  "date": "2026-03-29",
  "funnelsProcessed": 47
}
```

**Example Usage:**
```bash
# Run daily aggregation (cron job at 2am)
curl -X POST "http://localhost:3000/api/funnels/aggregate"

# Backfill specific date
curl -X POST "http://localhost:3000/api/funnels/aggregate?date=2026-03-20"

# Calculate only purchase funnel
curl -X POST "http://localhost:3000/api/funnels/aggregate?funnel=purchase_funnel"
```

#### GET /api/funnels
Query stored funnel metrics.

**Query Parameters:**
- `funnelName`: Filter by funnel (e.g., "purchase_funnel")
- `startDate`: Date range start
- `endDate`: Date range end
- `platform`: Filter by platform ("web", "mobile_ios", "mobile_android")
- `utmSource`: Filter by UTM source

**Response (200):**
```json
{
  "success": true,
  "count": 2,
  "funnels": [
    {
      "id": "...",
      "funnelName": "purchase_funnel",
      "date": "2026-03-29T00:00:00Z",
      "step1Name": "landing",
      "step1Count": 1500,
      "step2Name": "upgrade_viewed",
      "step2Count": 450,
      "step2Rate": 0.30,
      "step3Name": "upgrade_clicked",
      "step3Count": 180,
      "step3Rate": 0.40,
      "step4Name": "checkout_initiated",
      "step4Count": 120,
      "step4Rate": 0.67,
      "step5Name": "payment_completed",
      "step5Count": 90,
      "step5Rate": 0.75,
      "overallRate": 0.06,
      "dropoffStep": "upgrade_clicked",
      "dropoffRate": 0.60,
      "platform": "web",
      "utmSource": "google",
      "utmMedium": "cpc",
      "utmCampaign": "q4_promo"
    }
  ]
}
```

**Example Queries:**
```bash
# Get purchase funnel for last 30 days
curl "http://localhost:3000/api/funnels?funnelName=purchase_funnel&startDate=2026-03-01&endDate=2026-03-30"

# Compare web vs mobile
curl "http://localhost:3000/api/funnels?funnelName=signup_funnel&platform=web"
curl "http://localhost:3000/api/funnels?funnelName=signup_funnel&platform=mobile_ios"

# Analyze specific campaign
curl "http://localhost:3000/api/funnels?utmSource=google&utmCampaign=q4_promo"
```

## Funnel Calculations

### Unique User Counting

```typescript
// Count unique users at each step
const users = await prisma.analyticsEvent.findMany({
  where: {
    timestamp: { gte: startDate, lte: endDate },
    eventName: step.event
  },
  select: { userId: true, anonymousId: true },
  distinct: ['userId', 'anonymousId']
})

// Use userId if available, else anonymousId
const uniqueUsers = new Set(
  users.map(u => u.userId || u.anonymousId)
).size
```

**Result:** Handles both authenticated and anonymous users correctly.

### Conversion Rate Calculation

```typescript
// Rate = Users at step N / Users at step N-1
const conversionRate = stepCounts[i] / stepCounts[i - 1]
```

**Example:**
- Step 1 (landing): 1000 users
- Step 2 (upgrade_viewed): 300 users → **30% rate**
- Step 3 (upgrade_clicked): 150 users → **50% rate**
- Step 4 (payment_completed): 90 users → **60% rate**

**Overall rate:** 90 / 1000 = **9%**

### Drop-off Detection

```typescript
// Find step with highest drop-off
let maxDropoff = 0
let dropoffStep = ''

for (let i = 1; i < stepRates.length; i++) {
  const dropoff = 1 - stepRates[i]
  if (dropoff > maxDropoff) {
    maxDropoff = dropoff
    dropoffStep = steps[i].name
  }
}
```

**Example:**
- Step 1→2: 30% rate → 70% drop-off
- Step 2→3: 50% rate → 50% drop-off
- Step 3→4: 60% rate → 40% drop-off

**Worst step:** Step 1→2 with 70% drop-off

## Segmentation Strategy

### Overall Funnel (No Segmentation)
Baseline metrics for all users combined.

### Platform Segmentation
- **Web**: Desktop/mobile web users
- **Mobile iOS**: Native iOS app users
- **Mobile Android**: Native Android app users

**Use Case:** Compare mobile app vs web performance.

### UTM Campaign Segmentation
Calculates funnels for top 5 campaigns by traffic volume.

```typescript
const topSources = await prisma.analyticsEvent.groupBy({
  by: ['utmSource', 'utmMedium', 'utmCampaign'],
  where: {
    timestamp: { gte: startDate, lte: endDate },
    utmSource: { not: null }
  },
  _count: true,
  orderBy: { _count: { utmSource: 'desc' } },
  take: 5
})
```

**Use Case:** Identify which campaigns drive best conversions.

## Example Analysis Scenarios

### 1. Identify Purchase Funnel Bottleneck

```javascript
// Query purchase funnel for last week
const funnels = await fetch('/api/funnels?funnelName=purchase_funnel&startDate=2026-03-23')

// Find worst step
const worst = funnels[0]
console.log(`Worst drop-off: ${worst.dropoffStep} (${worst.dropoffRate * 100}% lost)`)

// Example output:
// "Worst drop-off: upgrade_clicked (60% lost)"
// Action: Improve upgrade page UX, add social proof
```

### 2. Compare Campaign Performance

```javascript
// Get funnels segmented by campaign
const googleCPC = await fetch('/api/funnels?utmSource=google&utmMedium=cpc')
const facebookAds = await fetch('/api/funnels?utmSource=facebook&utmMedium=paid')

console.log('Google CPC overall rate:', googleCPC[0].overallRate)
console.log('Facebook Ads overall rate:', facebookAds[0].overallRate)

// Example output:
// Google CPC: 9% overall rate
// Facebook Ads: 6% overall rate
// Action: Increase Google CPC budget, optimize Facebook targeting
```

### 3. Track Funnel Improvements Over Time

```javascript
// Get 30 days of signup funnel data
const history = await fetch('/api/funnels?funnelName=signup_funnel&startDate=2026-03-01&endDate=2026-03-30')

// Plot time-series chart
const chartData = history.map(f => ({
  date: f.date,
  overallRate: f.overallRate * 100
}))

// Example: See if new signup flow improved conversions
// Before (Mar 1-15): 12% average
// After (Mar 16-30): 18% average
// Improvement: +50% conversion rate
```

### 4. Mobile vs Web Comparison

```javascript
const webFunnel = await fetch('/api/funnels?funnelName=screener_funnel&platform=web')
const mobileFunnel = await fetch('/api/funnels?funnelName=screener_funnel&platform=mobile_ios')

console.log('Web screener usage:', webFunnel[0].step2Rate)
console.log('Mobile screener usage:', mobileFunnel[0].step2Rate)

// Example:
// Web: 45% use screener filters
// Mobile: 28% use screener filters
// Action: Improve mobile screener UX, make filters more accessible
```

## Performance Considerations

### Daily Aggregation Timing

For 10,000 daily users across 5 funnels:
- **Unique user queries**: ~50 queries (5 funnels × 10 segments avg)
- **Per-query cost**: ~100ms (indexed timestamp + eventName)
- **Total time**: ~5 seconds

**Optimization:** Run at 2 AM when traffic is lowest.

### Query Performance

```javascript
// Fast: Uses funnelName + date index
db.conversion_funnels.find({
  funnelName: "purchase_funnel",
  date: { $gte: startDate, $lte: endDate }
})

// Fast: Uses UTM index
db.conversion_funnels.find({
  utmSource: "google",
  utmMedium: "cpc"
})

// Slower: No index (but acceptable for admin queries)
db.conversion_funnels.find({
  overallRate: { $gt: 0.10 }
})
```

## Integration with Sprint 4 Tasks

**Dependencies:**
- SP4-01: Event Ingestion API (provides raw events)
- SP4-02: Client Tracking Wrapper (generates events)
- SP4-03: Server Payment Events (payment_completed events)
- SP4-04: Sessions & Identity Stitching (unique user counting)

**Result:** Complete analytics pipeline from event capture to actionable funnel metrics.

## Cron Job Setup

### Vercel Cron Configuration

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/sessions/aggregate",
      "schedule": "0 1 * * *"
    },
    {
      "path": "/api/funnels/aggregate",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Schedule:**
- 1 AM: Aggregate sessions (SP4-04)
- 2 AM: Calculate funnels (SP4-05)

**Note:** Funnels run after sessions to ensure stitched user data is available.

## Testing Strategy

### Test Purchase Funnel Calculation

```bash
# 1. Generate test events for user journey
curl -X POST http://localhost:3000/api/events/track \
  -d '{"eventName":"session_start","sessionId":"s1","anonymousId":"a1","timestamp":"2026-03-29T10:00:00Z"}'

curl -X POST http://localhost:3000/api/events/track \
  -d '{"eventName":"upgrade_modal_viewed","sessionId":"s1","anonymousId":"a1","timestamp":"2026-03-29T10:05:00Z"}'

curl -X POST http://localhost:3000/api/events/track \
  -d '{"eventName":"upgrade_button_clicked","sessionId":"s1","anonymousId":"a1","timestamp":"2026-03-29T10:06:00Z"}'

curl -X POST http://localhost:3000/api/events/track \
  -d '{"eventName":"payment_checkout_initiated","sessionId":"s1","anonymousId":"a1","timestamp":"2026-03-29T10:07:00Z"}'

curl -X POST http://localhost:3000/api/events/track \
  -d '{"eventName":"payment_completed","sessionId":"s1","anonymousId":"a1","userId":"u1","timestamp":"2026-03-29T10:10:00Z"}'

# 2. Run funnel aggregation
curl -X POST "http://localhost:3000/api/funnels/aggregate?date=2026-03-29&funnel=purchase_funnel"

# 3. Verify funnel created
curl "http://localhost:3000/api/funnels?funnelName=purchase_funnel&startDate=2026-03-29"

# Expected:
# - step1Count: 1 (landing)
# - step2Count: 1 (upgrade_viewed)
# - step3Count: 1 (upgrade_clicked)
# - step4Count: 1 (checkout_initiated)
# - step5Count: 1 (payment_completed)
# - overallRate: 1.0 (100% - user completed all steps)
```

### MongoDB Verification

```javascript
// Check funnel records
db.conversion_funnels.find({ 
  funnelName: "purchase_funnel",
  date: ISODate("2026-03-29") 
})

// Aggregate drop-off analysis
db.conversion_funnels.aggregate([
  { $match: { funnelName: "purchase_funnel" } },
  { $group: {
      _id: "$dropoffStep",
      avgDropoff: { $avg: "$dropoffRate" },
      count: { $sum: 1 }
  }},
  { $sort: { avgDropoff: -1 } }
])

// Time-series trend
db.conversion_funnels.aggregate([
  { $match: { 
      funnelName: "signup_funnel",
      platform: null // Overall funnel
  }},
  { $sort: { date: 1 } },
  { $project: {
      date: 1,
      overallRate: 1,
      step1Count: 1
  }}
])
```

## Success Criteria

- [x] ConversionFunnel model with flexible step structure
- [x] 5 predefined funnels (signup, purchase, watchlist, screener, engagement)
- [x] POST /api/funnels/aggregate (daily cron job)
- [x] GET /api/funnels (query metrics)
- [x] Unique user counting (userId or anonymousId)
- [x] Per-step conversion rate calculation
- [x] Drop-off step identification
- [x] Platform segmentation (web, mobile_ios, mobile_android)
- [x] UTM campaign segmentation (top 5 by volume)
- [x] Overall conversion rate tracking
- [x] Build passes with 40 routes compiled
- [x] Documentation complete

## Files Changed

**Modified:**
- `prisma/schema.prisma` (+45 lines) - ConversionFunnel model

**Created:**
- `app/api/funnels/route.ts` (366 lines) - Funnel aggregation and query

**Total:** 411 lines added

---

**Completion Date:** 2026-03-30  
**Build Status:** ✅ Passing (40 routes)  
**Branch:** sprint-1/foundation  
**Sprint 4 Progress:** 29/29 SP (100% COMPLETE!) 🎉
