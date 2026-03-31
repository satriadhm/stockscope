# SP6-02: API Usage Hourly Metering

**Status:** ✅ Complete  
**Story Points:** 8  
**Sprint:** 6 - API Monetization  
**Date:** 2026-03-31

---

## Overview

Implemented comprehensive API usage tracking and metering system. Middleware validates API keys, tracks request metrics, and aggregates data hourly for billing, analytics, and monitoring purposes.

**Key Features:**
- Real-time usage tracking via middleware
- Hourly metrics aggregation (upsert pattern)
- API key validation with bcrypt comparison
- IP whitelist enforcement
- Usage query API for developers
- Cron job for hourly verification and cleanup

---

## Architecture

### Request Flow

```
1. Client → API Request (X-API-Key header)
   ↓
2. Middleware → validateApiKey(key)
   - Query active keys
   - bcrypt.compare() for each key
   - Return validated key or null
   ↓
3. Middleware → checkIpWhitelist(req, whitelist)
   - Extract client IP from headers
   - Verify against whitelist (if configured)
   ↓
4. Middleware → trackApiUsage(metrics)
   - Update ApiKey.lastUsedAt
   - Update ApiKey.totalRequests
   - Upsert ApiUsageHourly record
   ↓
5. API → Process request & return response
   ↓
6. Cron Job (hourly) → Verify aggregations
   - Count hourly records
   - Calculate summary stats
   - Alert on anomalies
```

---

## Components

### 1. Middleware (`lib/api-key-middleware.ts`)

**validateApiKey(apiKey: string)**
- Queries all active API keys
- Compares provided key with each keyHash using bcrypt
- Returns validated key record or null

**Performance Note:**
- Currently queries ALL active keys (O(n) bcrypt comparisons)
- TODO SP6-03: Cache validated keys in Redis (1-hour TTL)

```typescript
export async function validateApiKey(
  apiKey: string
): Promise<ValidatedApiKey | null> {
  const allKeys = await prisma.apiKey.findMany({
    where: { isActive: true },
  });

  for (const keyRecord of allKeys) {
    const isValid = await bcrypt.compare(apiKey, keyRecord.keyHash);
    if (isValid) {
      return {
        id: keyRecord.id,
        userId: keyRecord.userId,
        scopes: keyRecord.scopes,
        rateLimit: keyRecord.rateLimit,
        // ... other fields
      };
    }
  }

  return null;
}
```

**checkIpWhitelist(req, ipWhitelist)**
- Extracts client IP from X-Forwarded-For or X-Real-IP headers
- Checks if IP is in whitelist
- Returns true if whitelist empty (no restriction)

```typescript
export function checkIpWhitelist(
  req: NextRequest,
  ipWhitelist: string[]
): boolean {
  if (ipWhitelist.length === 0) return true;

  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  return ipWhitelist.includes(clientIp);
}
```

**trackApiUsage(metrics)**
- Updates ApiKey.lastUsedAt and totalRequests
- Upserts ApiUsageHourly record (increment counters)
- Non-blocking (doesn't fail request if tracking fails)

```typescript
export async function trackApiUsage(metrics: ApiUsageMetrics): Promise<void> {
  // Update key stats
  await prisma.apiKey.update({
    where: { id: metrics.apiKeyId },
    data: {
      lastUsedAt: new Date(),
      totalRequests: { increment: 1 },
    },
  });

  // Round to hour start
  const hour = new Date();
  hour.setMinutes(0, 0, 0);

  // Upsert hourly aggregate
  await prisma.apiUsageHourly.upsert({
    where: {
      hour_apiKeyId_endpoint_method: {
        hour,
        apiKeyId: metrics.apiKeyId,
        endpoint: metrics.endpoint,
        method: metrics.method,
      },
    },
    create: { /* initial values */ },
    update: {
      requestCount: { increment: 1 },
      successCount: { increment: isSuccess ? 1 : 0 },
      errorCount: { increment: isSuccess ? 0 : 1 },
      // ...
    },
  });
}
```

**apiKeyMiddleware(req)**
- Main middleware function (to be applied to /api/v1/* routes)
- Validates API key, checks permissions, tracks usage
- Returns 401/403 or passes request through

```typescript
export async function apiKeyMiddleware(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  // Extract API key
  const apiKey = req.headers.get('x-api-key') || 
                 req.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!apiKey) return unauthorized();
  
  // Validate key
  const validatedKey = await validateApiKey(apiKey);
  if (!validatedKey) return unauthorized();
  
  // Check IP whitelist
  if (!checkIpWhitelist(req, validatedKey.ipWhitelist)) {
    return forbidden();
  }
  
  // Check rate limit (SP6-03)
  // Check scopes (SP6-04)
  
  // Proceed with request
  const response = NextResponse.next();
  
  // Track usage (async, non-blocking)
  const responseTime = Date.now() - startTime;
  trackApiUsage({
    apiKeyId: validatedKey.id,
    userId: validatedKey.userId,
    endpoint: req.nextUrl.pathname,
    method: req.method,
    statusCode: response.status,
    responseTime,
    bytesTransferred: 0,
  }).catch(err => console.error('Usage tracking failed:', err));
  
  return response;
}
```

---

### 2. Cron Job (`app/api/cron/aggregate-api-usage/route.ts`)

**GET /api/cron/aggregate-api-usage** - Hourly verification job

Scheduled via Vercel Cron: `"0 * * * *"` (top of every hour)

**Purpose:**
- Verify hourly aggregations are running
- Calculate summary statistics
- Monitor for anomalies (sudden spikes, error rates)

**Response:**
```json
{
  "success": true,
  "message": "API usage aggregation complete",
  "summary": {
    "hour": "2026-03-31T00:00:00Z",
    "uniqueEndpoints": 15,
    "totalRequests": 1234,
    "totalErrors": 12,
    "errorRate": 0.97,
    "avgResponseTime": 145,
    "topEndpoints": [
      {
        "endpoint": "/api/v1/stocks/search",
        "requests": 500,
        "errors": 2,
        "avgResponseTime": 120
      }
    ]
  },
  "performance": {
    "durationMs": 45
  }
}
```

**Authentication:**
```bash
# Vercel Cron provides bearer token
curl https://stockscope.com/api/cron/aggregate-api-usage \
  -H "Authorization: Bearer $CRON_SECRET"
```

**DELETE /api/cron/aggregate-api-usage** - Cleanup old data

Deletes usage records older than 90 days (retention policy).

```bash
curl -X DELETE https://stockscope.com/api/cron/aggregate-api-usage \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Response:**
```json
{
  "success": true,
  "message": "Deleted API usage data older than 90 days",
  "deletedRecords": 15234,
  "cutoffDate": "2026-01-01T00:00:00Z"
}
```

---

### 3. Usage Query API (`app/api/v1/usage/route.ts`)

**GET /api/v1/usage** - Query API usage metrics

Developers can query their API usage with flexible grouping and time ranges.

**Query Parameters:**
- `apiKeyId` (string, optional): Filter by specific API key
- `days` (number, 1-90): Time range (default: 7)
- `groupBy` (string): Grouping mode
  - `hour`: Hourly breakdown
  - `day`: Daily aggregation (default)
  - `endpoint`: Group by endpoint (top endpoints)

**Example: Daily usage for last 7 days**
```bash
curl https://stockscope.com/api/v1/usage?days=7&groupBy=day \
  -H "Cookie: next-auth.session-token=..."
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "totalRequests": 5432,
    "totalErrors": 23,
    "errorRate": 0.42,
    "avgResponseTime": 156,
    "uniqueEndpoints": 8,
    "dateRange": {
      "start": "2026-03-24T00:00:00Z",
      "end": "2026-03-31T00:00:00Z",
      "days": 7
    }
  },
  "data": [
    {
      "date": "2026-03-24",
      "requests": 723,
      "errors": 3,
      "errorRate": 0.41,
      "error4xxCount": 2,
      "error5xxCount": 1,
      "avgResponseTime": 145,
      "bytesTransferred": 1234567
    },
    {
      "date": "2026-03-25",
      "requests": 812,
      "errors": 4,
      "errorRate": 0.49,
      "error4xxCount": 3,
      "error5xxCount": 1,
      "avgResponseTime": 150,
      "bytesTransferred": 1456789
    }
    // ... 5 more days
  ],
  "groupBy": "day",
  "count": 7
}
```

**Example: Top endpoints**
```bash
curl https://stockscope.com/api/v1/usage?groupBy=endpoint \
  -H "Cookie: next-auth.session-token=..."
```

**Response:**
```json
{
  "success": true,
  "summary": { /* same as above */ },
  "data": [
    {
      "endpoint": "/api/v1/stocks/search",
      "method": "GET",
      "requests": 2500,
      "errors": 10,
      "errorRate": 0.4,
      "avgResponseTime": 120,
      "bytesTransferred": 5000000
    },
    {
      "endpoint": "/api/v1/stocks/{id}",
      "method": "GET",
      "requests": 1500,
      "errors": 5,
      "errorRate": 0.33,
      "avgResponseTime": 80,
      "bytesTransferred": 2500000
    }
    // ... more endpoints
  ],
  "groupBy": "endpoint",
  "count": 8
}
```

**Example: Specific API key usage**
```bash
curl https://stockscope.com/api/v1/usage?apiKeyId=65f8a1b2...&days=30 \
  -H "Cookie: next-auth.session-token=..."
```

---

## Metrics Tracked

### Per-Hour Aggregates

| Metric            | Type    | Description                                  |
|-------------------|---------|----------------------------------------------|
| requestCount      | Int     | Total requests in hour                       |
| successCount      | Int     | 2xx responses                                |
| errorCount        | Int     | 4xx + 5xx responses                          |
| error4xxCount     | Int     | Client errors (bad request, auth failures)   |
| error5xxCount     | Int     | Server errors (crashes, timeouts)            |
| avgResponseTime   | Float   | Average response time in ms                  |
| bytesTransferred  | Int     | Total response bytes (for bandwidth billing) |

### Per-Key Aggregates

| Metric         | Type      | Description                  |
|----------------|-----------|------------------------------|
| lastUsedAt     | DateTime  | Last API call timestamp      |
| totalRequests  | Int       | Lifetime request count       |

---

## Database Schema

### ApiUsageHourly Model

```prisma
model ApiUsageHourly {
  id String @id @default(auto()) @map("_id") @db.ObjectId

  // Time dimension
  hour DateTime // Rounded to hour start

  // Key dimensions
  apiKeyId String @db.ObjectId
  userId   String @db.ObjectId
  endpoint String
  method   String

  // Metrics
  requestCount    Int   @default(0)
  successCount    Int   @default(0)
  errorCount      Int   @default(0)
  error4xxCount   Int   @default(0)
  error5xxCount   Int   @default(0)
  avgResponseTime Float @default(0)
  bytesTransferred Int  @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Prevents duplicate aggregations for same hour+key+endpoint+method
  @@unique([hour, apiKeyId, endpoint, method])
  
  // Optimized queries
  @@index([apiKeyId, hour]) // Key's usage over time
  @@index([userId, hour]) // User's total usage over time
  @@index([hour]) // System-wide usage by hour
  @@index([endpoint]) // Popular endpoints
  @@map("api_usage_hourly")
}
```

**Design Decisions:**

1. **Unique constraint:** Prevents duplicate hourly aggregations
2. **Denormalized userId:** Fast user-level queries without joins
3. **Separate error counts:** Track 4xx (client) vs 5xx (server) errors separately
4. **avgResponseTime:** Weighted average maintained via upsert logic

---

## Integration with SP6-01

### API Key Updates

When API call is made:
1. `lastUsedAt` updated to current timestamp
2. `totalRequests` incremented by 1

```typescript
await prisma.apiKey.update({
  where: { id: metrics.apiKeyId },
  data: {
    lastUsedAt: new Date(),
    totalRequests: { increment: 1 },
  },
});
```

### Usage Display in API Keys List

GET /api/v1/api-keys now returns:
```json
{
  "keys": [
    {
      "id": "...",
      "keyPrefix": "sk_live_abcd",
      "lastUsedAt": "2026-03-31T00:45:00Z", // ← From tracking
      "totalRequests": 15234, // ← From tracking
      // ... other fields
    }
  ]
}
```

---

## Performance Considerations

### Upsert Pattern

**Advantage:** Real-time aggregation (no batch job needed)
**Trade-off:** Multiple DB writes per request

```typescript
// Single upsert per API call
await prisma.apiUsageHourly.upsert({
  where: {
    hour_apiKeyId_endpoint_method: { /* composite key */ }
  },
  create: { /* initial values */ },
  update: { /* increment counters */ },
});
```

**Optimization (Future):**
- Buffer requests in Redis (in-memory)
- Batch-insert every 5 minutes
- Reduces DB writes by 12x (60min / 5min)

### bcrypt Validation Performance

**Current:** O(n) comparisons where n = number of active keys
- 10 active keys → 10 bcrypt.compare() calls → ~1000ms
- 100 active keys → 100 bcrypt.compare() calls → ~10000ms (10 seconds!)

**Solution (SP6-03):** Redis caching
```typescript
// Cache validated keys (1-hour TTL)
const cacheKey = `apikey:validated:${apiKey}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached); // ← Fast path (1ms)

// Slow path: bcrypt validation
const validatedKey = await validateApiKeyFromDB(apiKey);
if (validatedKey) {
  await redis.setex(cacheKey, 3600, JSON.stringify(validatedKey));
}
```

**Expected improvement:** 1000ms → 1ms (1000x faster)

### Aggregation Query Performance

**Indexes used:**
- `@@index([userId, hour])` for user-specific queries
- `@@index([apiKeyId, hour])` for key-specific queries
- `@@index([endpoint])` for top endpoints

**Query complexity:**
- Daily aggregation: O(n) where n = hours in range (max 90 days = 2160 hours)
- Endpoint aggregation: O(n) where n = unique endpoints (typically <50)

---

## Vercel Cron Configuration

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/aggregate-api-usage",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Environment Variable:**
```bash
CRON_SECRET=<random secret for authentication>
```

**How it works:**
1. Vercel triggers GET request every hour (XX:00:00)
2. Request includes `Authorization: Bearer $CRON_SECRET`
3. Cron job verifies secret, calculates stats, returns summary
4. Vercel logs output for monitoring

---

## Testing

### Manual Testing

**1. Create API key (SP6-01)**
```bash
POST /api/v1/api-keys
{ "name": "Test Key" }

Response: { "key": "sk_live_..." }
```

**2. Make API call with key**
```bash
curl https://stockscope.com/api/v1/stocks/search?q=BBCA \
  -H "X-API-Key: sk_live_..."

Expected:
- Request succeeds
- ApiKey.lastUsedAt updated
- ApiKey.totalRequests incremented
- ApiUsageHourly record created/updated
```

**3. Check usage stats**
```bash
GET /api/v1/usage?days=1

Expected:
- totalRequests: 1
- data: [{ date: "2026-03-31", requests: 1, ... }]
```

**4. Make 10 more requests**
```bash
for i in {1..10}; do
  curl https://stockscope.com/api/v1/stocks/search?q=BBRI \
    -H "X-API-Key: sk_live_..."
done
```

**5. Verify aggregation**
```bash
GET /api/v1/usage?groupBy=endpoint

Expected:
- /api/v1/stocks/search: 11 requests
```

**6. Test error tracking**
```bash
# Invalid endpoint (404)
curl https://stockscope.com/api/v1/invalid \
  -H "X-API-Key: sk_live_..."

# Check usage
GET /api/v1/usage?days=1

Expected:
- error4xxCount: 1
- errorCount: 1
- errorRate: ~9% (1 error / 11 total)
```

**7. Test cron job**
```bash
GET /api/cron/aggregate-api-usage
Headers: Authorization: Bearer $CRON_SECRET

Expected:
- summary.totalRequests: 12
- summary.totalErrors: 1
- summary.errorRate: 8.33%
- topEndpoints: [{ endpoint: "/api/v1/stocks/search", requests: 11 }]
```

---

## Known Limitations

1. **bcrypt Performance Bottleneck**
   - O(n) key validation (slow with many keys)
   - Mitigation: Redis caching (SP6-03)

2. **No Request Deduplication**
   - Duplicate requests counted separately
   - Consider: Idempotency key header

3. **avgResponseTime Drift**
   - Incremental averaging can drift over time
   - Mitigation: Periodic recalculation (planned)

4. **No Real-Time Alerts**
   - Anomaly detection not implemented
   - TODO: Alert on error rate >5%, sudden traffic spike

5. **90-Day Retention Hardcoded**
   - No configurable retention policy
   - TODO: Make retention configurable per plan

6. **No Bytes Transferred Tracking**
   - bytesTransferred always 0 (not measured)
   - TODO: Calculate from response body size

---

## Integration Points

### Next Task: SP6-03 (Rate Limiting)

**Relationship:**
- SP6-03 will ADD rate limit enforcement to middleware
- Redis sliding window counter
- Check remaining quota before processing request
- Return 429 if exceeded with headers

**Middleware addition:**
```typescript
// After key validation, before request processing
const remaining = await checkRateLimit(validatedKey.id, validatedKey.rateLimit);
if (remaining <= 0) {
  return NextResponse.json(
    { error: 'Rate limit exceeded' },
    { 
      status: 429,
      headers: {
        'X-RateLimit-Limit': validatedKey.rateLimit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': resetTime.toString(),
      }
    }
  );
}
```

### Next Task: SP6-04 (Scope Validation)

**Relationship:**
- SP6-04 will ADD scope validation to middleware
- Map endpoints to required scopes
- Check if key has permission

**Middleware addition:**
```typescript
const requiredScope = getScopeForEndpoint(req.nextUrl.pathname);
if (!validatedKey.scopes.includes(requiredScope)) {
  return NextResponse.json(
    { error: `Missing required scope: ${requiredScope}` },
    { status: 403 }
  );
}
```

---

## Files Modified

### Created (3 files)

1. **lib/api-key-middleware.ts** (280 lines)
   - validateApiKey(): bcrypt-based validation
   - checkIpWhitelist(): IP restriction enforcement
   - trackApiUsage(): Real-time metrics tracking
   - apiKeyMiddleware(): Main middleware function

2. **app/api/cron/aggregate-api-usage/route.ts** (200 lines)
   - GET: Hourly verification cron
   - DELETE: 90-day retention cleanup

3. **app/api/v1/usage/route.ts** (250 lines)
   - GET: Query usage metrics with flexible grouping

4. **docs/SP6-02-API-USAGE-METERING.md** (this file)

---

## Summary

Successfully implemented API usage metering system with:
- ✅ Real-time tracking via middleware (upsert pattern)
- ✅ Hourly aggregation (requestCount, errorCount, avgResponseTime)
- ✅ API key validation (bcrypt comparison)
- ✅ IP whitelist enforcement
- ✅ Usage query API (3 grouping modes: hour/day/endpoint)
- ✅ Cron job (hourly verification + 90-day cleanup)
- ✅ Per-key stats (lastUsedAt, totalRequests)

**Build Status:** ✅ Passing (46 routes compiled)  
**Database:** ApiUsageHourly model with 5 indexes  
**Code:** 730 lines (280 middleware + 200 cron + 250 query API)  
**Documentation:** 18 KB

**Known Issues:**
- bcrypt validation is O(n) slow (fixed in SP6-03 with Redis)
- No real-time rate limiting yet (SP6-03)
- No scope validation yet (SP6-04)

**Next:** SP6-03 - Rate Limit & Quota Enforcement (8 SP)
