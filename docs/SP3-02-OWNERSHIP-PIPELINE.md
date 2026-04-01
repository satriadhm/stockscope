# SP3-02: Ownership Snapshot Pipeline

**Sprint:** 3 - Research Data Pipeline  
**Story Points:** 5  
**Status:** ✅ Complete  
**Completed:** 2026-03-30

## Overview

Implemented daily ownership data tracking system from IDX reports. Enables institutional analysis, governance scoring, and ownership change detection over time.

## Deliverables

### 1. Database Schema

#### Ownership Snapshot Model

```prisma
model OwnershipSnapshot {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  ticker      String
  date        DateTime
  holderName  String
  shares      BigInt
  percentage  Float
  holderType  String?  // "Institution" | "Individual" | "Government" | "Foreign"
  
  @@unique([ticker, date, holderName])
  @@index([ticker, date])
  @@index([date])
  @@index([holderName])
  @@map("ownership_snapshots")
}
```

**Key Design Decisions:**

1. **Unique Constraint:** `[ticker, date, holderName]`
   - Prevents duplicate holder records per stock per day
   - Enables safe upsert operations for daily updates

2. **Indexes:**
   - `[ticker, date]`: Fast queries for single-stock ownership history
   - `[date]`: Market-wide ownership snapshots
   - `[holderName]`: Track specific holders across multiple stocks

3. **BigInt for Shares:**
   - Supports large share counts (e.g., 121 billion shares for BBCA)
   - Converted to string in API responses for JSON compatibility

### 2. API Endpoints (3 Methods, 1 Route)

#### GET /api/ownership-snapshots

**Query Parameters:**
- `ticker`: Stock ticker (e.g., `?ticker=BBCA`)
- `date`: Specific date (e.g., `?date=2024-03-29`)
- `holderName`: Search holder name (e.g., `?holderName=BlackRock`)
- `holderType`: Filter by type (e.g., `?holderType=Institution`)
- `minPercentage`: Min ownership % (e.g., `?minPercentage=5`)
- `limit`: Max records (default: 100, max: 1000)

**Response Example:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": "...",
      "ticker": "BBCA",
      "date": "2024-03-29T00:00:00.000Z",
      "holderName": "PT Dwimuria Investama Andalan",
      "shares": "3500000000",
      "percentage": 10.5,
      "holderType": "Institution",
      "createdAt": "2026-03-30T...",
      "updatedAt": "2026-03-30T..."
    }
  ]
}
```

#### POST /api/ownership-snapshots

**Single Snapshot Upload:**
```json
{
  "ticker": "BBCA",
  "date": "2024-03-29",
  "holderName": "PT Dwimuria Investama Andalan",
  "shares": 3500000000,
  "percentage": 10.5,
  "holderType": "Institution"
}
```

**Batch Upload:**
```json
{
  "snapshots": [
    {
      "ticker": "BBCA",
      "date": "2024-03-29",
      "holderName": "PT Dwimuria Investama Andalan",
      "shares": 3500000000,
      "percentage": 10.5,
      "holderType": "Institution"
    },
    {
      "ticker": "BBCA",
      "date": "2024-03-29",
      "holderName": "PT Fajar Surya Swadaya",
      "shares": 2100000000,
      "percentage": 6.3,
      "holderType": "Institution"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Processed 2 ownership snapshots",
  "count": 2
}
```

**Upsert Logic:**
- If `ticker+date+holderName` exists → UPDATE shares and percentage
- Otherwise → CREATE new record
- Idempotent: safe to run multiple times with same data

#### DELETE /api/ownership-snapshots

**Query Parameters:**
- `ticker`: Stock ticker (required)
- `date`: Specific date (required)

**Use Case:** Remove bad data from scraping errors

**Response:**
```json
{
  "success": true,
  "message": "Deleted 10 ownership snapshots",
  "deletedCount": 10
}
```

## Use Cases

### 1. Governance Scoring
```sql
-- Find stocks with high institutional ownership (>50%)
SELECT ticker, SUM(percentage) as institutional_pct
FROM ownership_snapshots
WHERE date = '2024-03-29' AND holderType = 'Institution'
GROUP BY ticker
HAVING institutional_pct > 50
```

### 2. Ownership Change Detection
```typescript
// Compare ownership between two dates
const march = await prisma.ownershipSnapshot.findMany({
  where: { ticker: 'BBCA', date: new Date('2024-03-29') }
})

const feb = await prisma.ownershipSnapshot.findMany({
  where: { ticker: 'BBCA', date: new Date('2024-02-28') }
})

// Calculate changes in holder percentages
const changes = march.map(m => {
  const prev = feb.find(f => f.holderName === m.holderName)
  return {
    holder: m.holderName,
    change: m.percentage - (prev?.percentage || 0)
  }
})
```

### 3. Cross-Holdings Analysis
```typescript
// Find all stocks held by a specific investor
const holdings = await prisma.ownershipSnapshot.findMany({
  where: {
    holderName: { contains: 'BlackRock' },
    date: new Date('2024-03-29'),
    percentage: { gte: 5 } // Only major holdings
  },
  orderBy: { percentage: 'desc' }
})
```

### 4. Foreign Investment Tracking
```typescript
// Track foreign ownership trends
const foreign = await prisma.ownershipSnapshot.findMany({
  where: {
    ticker: 'BBCA',
    holderType: 'Foreign',
    date: { gte: new Date('2024-01-01') }
  },
  orderBy: { date: 'asc' }
})

// Calculate total foreign ownership per day
const dailyForeign = foreign.reduce((acc, snap) => {
  const dateKey = snap.date.toISOString().split('T')[0]
  acc[dateKey] = (acc[dateKey] || 0) + snap.percentage
  return acc
}, {})
```

## Data Pipeline Integration

### Daily Scraping Workflow

```typescript
// 1. Fetch IDX ownership report (e.g., via web scraping)
const report = await fetchIDXOwnershipReport('BBCA', new Date())

// 2. Parse holders
const holders = parseOwnershipReport(report)

// 3. Batch upload to API
await fetch('/api/ownership-snapshots', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    snapshots: holders.map(h => ({
      ticker: 'BBCA',
      date: new Date().toISOString().split('T')[0],
      holderName: h.name,
      shares: h.shares,
      percentage: h.percentage,
      holderType: classifyHolderType(h.name)
    }))
  })
})
```

### Holder Type Classification

```typescript
function classifyHolderType(holderName: string): string {
  if (holderName.includes('PT ')) return 'Institution'
  if (holderName.includes('Pemerintah') || holderName.includes('Government')) return 'Government'
  if (holderName.includes('Foreign') || holderName.includes('Offshore')) return 'Foreign'
  return 'Individual'
}
```

## Technical Implementation

### Upsert Pattern (Core Logic)

```typescript
await prisma.ownershipSnapshot.upsert({
  where: {
    ticker_date_holderName: {
      ticker: ticker.toUpperCase(),
      date: new Date(date),
      holderName
    }
  },
  update: {
    shares: BigInt(shares),
    percentage,
    holderType: holderType || null
  },
  create: {
    ticker: ticker.toUpperCase(),
    date: new Date(date),
    holderName,
    shares: BigInt(shares),
    percentage,
    holderType: holderType || null
  }
})
```

**Benefits:**
- Idempotent: can re-run daily scraper safely
- No duplicate prevention code needed
- Handles both new holders and updates to existing holders

### BigInt JSON Serialization

```typescript
// Convert BigInt to string for JSON response
return NextResponse.json({
  success: true,
  data: snapshots.map(snapshot => ({
    ...snapshot,
    shares: snapshot.shares.toString()
  }))
})
```

## Testing

### Manual API Tests

```bash
# Add ownership snapshot
curl -X POST http://localhost:3000/api/ownership-snapshots \
  -H "Cookie: next-auth.session-token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "BBCA",
    "date": "2024-03-29",
    "holderName": "PT Dwimuria Investama Andalan",
    "shares": 3500000000,
    "percentage": 10.5,
    "holderType": "Institution"
  }'

# Query ownership for a stock
curl "http://localhost:3000/api/ownership-snapshots?ticker=BBCA&date=2024-03-29" \
  -H "Cookie: next-auth.session-token=..."

# Find major holders (>5%)
curl "http://localhost:3000/api/ownership-snapshots?ticker=BBCA&minPercentage=5" \
  -H "Cookie: next-auth.session-token=..."

# Track a specific holder
curl "http://localhost:3000/api/ownership-snapshots?holderName=BlackRock" \
  -H "Cookie: next-auth.session-token=..."

# Batch upload
curl -X POST http://localhost:3000/api/ownership-snapshots \
  -H "Cookie: next-auth.session-token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "snapshots": [
      {"ticker": "BBCA", "date": "2024-03-29", "holderName": "Holder 1", "shares": 1000000, "percentage": 5.0},
      {"ticker": "BBCA", "date": "2024-03-29", "holderName": "Holder 2", "shares": 500000, "percentage": 2.5}
    ]
  }'
```

### Build Status
✅ TypeScript compilation: Pass  
✅ Route generation: 33 routes (1 new)  
✅ No errors or warnings

## Files Changed

### Created (1 file)
- `app/api/ownership-snapshots/route.ts` (286 lines)

### Modified (1 file)
- `prisma/schema.prisma` (+23 lines: OwnershipSnapshot model)

**Total:** 309 new lines of code

## Next Steps

### Integration with Screener
Display ownership data in stock detail pages:
- Top 10 shareholders
- Ownership change charts
- Institutional vs. retail breakdown

### Governance Score Component
Add ownership-based scoring to AI engine:
- High institutional ownership: +points
- Stable ownership (low churn): +points
- Major foreign holders (liquidity): +points

### Alert System
Notify users of significant ownership changes:
- Alert when holder crosses 5% threshold
- Alert when insider buying/selling detected

## Success Metrics

✅ Schema designed for historical tracking  
✅ API endpoints support batch uploads  
✅ Upsert pattern prevents duplicates  
✅ Flexible filtering for various analyses  
✅ Build passing with zero errors

---

**Completed:** 2026-03-30  
**Assignee:** Data Engineer (GitHub Copilot)  
**Sprint:** 3 - Research Data Pipeline  
**Epic:** EPIC-03
