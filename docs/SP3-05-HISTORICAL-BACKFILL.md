# SP3-05: Historical Backfill (1-3 Years)

**Sprint:** 3 - Research Data Pipeline  
**Story Points:** 8  
**Status:** ✅ Complete  
**Completed:** 2026-03-30

## Overview

Documentation and utilities for populating historical data (1-3 years) into the new data pipeline. This is a **one-time operation** followed by daily incremental updates.

## Architecture Summary

The data pipeline now supports:
- **Company Master**: Static company info (populated once, updated rarely)
- **Daily Facts**: Time-series OHLC, volume, indicators (daily updates)
- **Ownership Snapshots**: Daily ownership data (daily updates)
- **AI Score Snapshots**: Model-versioned scores (daily updates)

## Backfill Strategy

### Phase 1: Company Master Data (One-Time)
**Estimated Time:** 30 minutes  
**Records:** ~900 stocks on IDX

```bash
# Extract unique companies from existing data
curl http://localhost:3000/api/stocks/enriched | jq -r '.stocks[] | {ticker, issuerName, sector}'

# Bulk upload to company master
curl -X POST http://localhost:3000/api/company-master/bulk \
  -H "Content-Type: application/json" \
  -d @company-master-seed.json
```

**company-master-seed.json format:**
```json
[
  {
    "ticker": "BBCA",
    "issuerName": "Bank Central Asia Tbk",
    "sector": "Banking",
    "subsector": "Commercial Bank",
    "listingDate": "2000-05-31",
    "sharesListed": 121654000000,
    "boardType": "Main Board"
  }
]
```

### Phase 2: Daily Facts Historical Data
**Estimated Time:** 2-6 hours  
**Records:** ~900 stocks × 252 trading days/year × 3 years = ~680,000 records

#### Option A: Yahoo Finance API (Recommended)
```python
import yfinance as yf
import requests
from datetime import datetime, timedelta

def backfill_daily_facts(ticker, years=3):
    # Fetch historical data
    stock = yf.Ticker(f"{ticker}.JK")  # .JK for Jakarta Stock Exchange
    end_date = datetime.now()
    start_date = end_date - timedelta(days=years*365)
    
    hist = stock.history(start=start_date, end=end_date)
    
    # Transform to daily facts format
    daily_facts = []
    for date, row in hist.iterrows():
        daily_facts.append({
            "ticker": ticker,
            "date": date.isoformat(),
            "open": row['Open'],
            "high": row['High'],
            "low": row['Low'],
            "close": row['Close'],
            "volume": int(row['Volume'])
        })
    
    # Batch upload (500 records at a time)
    for i in range(0, len(daily_facts), 500):
        batch = daily_facts[i:i+500]
        response = requests.post(
            'http://localhost:3000/api/daily-facts/bulk',
            json={"facts": batch},
            headers={"Cookie": "next-auth.session-token=..."}
        )
        print(f"Uploaded {len(batch)} records for {ticker}")

# Run for all stocks
tickers = ["BBCA", "BBRI", "BMRI", ...]  # Load from company master
for ticker in tickers:
    backfill_daily_facts(ticker, years=3)
```

#### Option B: IDX Historical Data CSV
```python
import pandas as pd
import requests

def backfill_from_csv(csv_path):
    df = pd.read_csv(csv_path)
    
    # Group by ticker
    for ticker, group in df.groupby('ticker'):
        facts = []
        for _, row in group.iterrows():
            facts.append({
                "ticker": ticker,
                "date": row['date'],
                "open": row['open'],
                "high": row['high'],
                "low": row['low'],
                "close": row['close'],
                "volume": int(row['volume'])
            })
        
        # Upload batch
        response = requests.post(
            'http://localhost:3000/api/daily-facts/bulk',
            json={"facts": facts},
            headers={"Cookie": "next-auth.session-token=..."}
        )
        print(f"Uploaded {len(facts)} records for {ticker}")

backfill_from_csv('idx_historical_3years.csv')
```

### Phase 3: Technical Indicators (Post-Backfill)
After daily facts are populated, calculate technical indicators:

```python
import pandas as pd
import requests

def calculate_and_update_indicators(ticker):
    # Fetch daily facts
    response = requests.get(
        f'http://localhost:3000/api/daily-facts?ticker={ticker}&limit=1000',
        headers={"Cookie": "next-auth.session-token=..."}
    )
    facts = response.json()['data']
    
    # Convert to DataFrame
    df = pd.DataFrame(facts)
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date')
    
    # Calculate SMA20, SMA50, RSI14
    df['sma20'] = df['close'].rolling(window=20).mean()
    df['sma50'] = df['close'].rolling(window=50).mean()
    
    # RSI calculation
    delta = df['close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    df['rsi14'] = 100 - (100 / (1 + rs))
    
    # Update daily facts with indicators
    for _, row in df.iterrows():
        requests.post(
            'http://localhost:3000/api/daily-facts',
            json={
                "ticker": ticker,
                "date": row['date'].isoformat(),
                "close": row['close'],
                "sma20": row['sma20'] if pd.notna(row['sma20']) else None,
                "sma50": row['sma50'] if pd.notna(row['sma50']) else None,
                "rsi14": row['rsi14'] if pd.notna(row['rsi14']) else None
            },
            headers={"Cookie": "next-auth.session-token=..."}
        )
    
    print(f"Updated indicators for {ticker}")

# Run for all stocks
tickers = ["BBCA", "BBRI", ...]
for ticker in tickers:
    calculate_and_update_indicators(ticker)
```

### Phase 4: Ownership Historical Data (Optional)
**Estimated Time:** 1-2 hours  
**Records:** ~900 stocks × 10 major holders × 3 years = ~27,000 snapshots

If historical ownership data is available:

```python
import requests

def backfill_ownership(ticker, date, holders):
    snapshots = []
    for holder in holders:
        snapshots.append({
            "ticker": ticker,
            "date": date,
            "holderName": holder['name'],
            "shares": holder['shares'],
            "percentage": holder['percentage'],
            "holderType": holder['type']
        })
    
    response = requests.post(
        'http://localhost:3000/api/ownership-snapshots',
        json={"snapshots": snapshots},
        headers={"Cookie": "next-auth.session-token=..."}
    )
    print(f"Uploaded {len(snapshots)} ownership records")

# Example usage
backfill_ownership("BBCA", "2023-12-31", [
    {"name": "PT Dwimuria Investama Andalan", "shares": 3500000000, "percentage": 10.5, "type": "Institution"},
    {"name": "PT Fajar Surya Swadaya", "shares": 2100000000, "percentage": 6.3, "type": "Institution"}
])
```

## Performance Optimization

### Batch Upload Endpoint
Create a bulk upload endpoint for performance:

```typescript
// app/api/daily-facts/bulk/route.ts
export async function POST(request: NextRequest) {
  const { facts } = await request.json()
  
  // Process in transactions of 100 records
  const BATCH_SIZE = 100
  const results = []
  
  for (let i = 0; i < facts.length; i += BATCH_SIZE) {
    const batch = facts.slice(i, i + BATCH_SIZE)
    
    await prisma.$transaction(
      batch.map(fact => prisma.dailyFact.upsert({
        where: {
          ticker_date: {
            ticker: fact.ticker,
            date: new Date(fact.date)
          }
        },
        update: fact,
        create: fact
      }))
    )
    
    results.push({ processed: batch.length })
  }
  
  return NextResponse.json({
    success: true,
    totalProcessed: facts.length,
    batches: results.length
  })
}
```

### Database Indexes
Already optimized in schema:
- `[ticker, date]` unique constraint for fast upserts
- `[date]` index for market-wide queries
- Automatic ticker index from unique constraint

### Parallel Processing
```python
from concurrent.futures import ThreadPoolExecutor
import requests

def backfill_single_ticker(ticker):
    # ... backfill logic ...
    pass

# Process 10 stocks in parallel
tickers = ["BBCA", "BBRI", "BMRI", ...]
with ThreadPoolExecutor(max_workers=10) as executor:
    executor.map(backfill_single_ticker, tickers)
```

## Data Validation Checklist

After backfill, verify data quality:

### 1. Record Counts
```sql
-- Check daily facts count per ticker
SELECT ticker, COUNT(*) as days
FROM daily_facts
GROUP BY ticker
ORDER BY days DESC;

-- Expected: ~750 days for 3 years (252 trading days/year)
```

### 2. Date Coverage
```sql
-- Find gaps in time series
SELECT ticker, date, 
  LAG(date) OVER (PARTITION BY ticker ORDER BY date) as prev_date,
  DATEDIFF(date, LAG(date) OVER (PARTITION BY ticker ORDER BY date)) as gap_days
FROM daily_facts
WHERE gap_days > 7;  -- More than 1 week gap (suspicious)
```

### 3. Price Anomalies
```sql
-- Find unrealistic price changes (>50% in one day)
SELECT ticker, date, open, close,
  ABS((close - open) / open) * 100 as pct_change
FROM daily_facts
WHERE ABS((close - open) / open) > 0.5;
```

### 4. Volume Outliers
```sql
-- Find zero or negative volumes
SELECT ticker, date, volume
FROM daily_facts
WHERE volume <= 0 OR volume IS NULL;
```

## Monitoring & Alerts

### Track Backfill Progress
```typescript
// Create progress tracker
interface BackfillProgress {
  ticker: string
  totalDays: number
  completedDays: number
  status: 'pending' | 'in_progress' | 'done' | 'failed'
  lastError?: string
}

// Store in Redis or database
await redis.hset('backfill:progress', ticker, JSON.stringify(progress))
```

### Quality Metrics
After backfill, record quality snapshot:

```bash
curl -X POST http://localhost:3000/api/data-quality \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-03-30",
    "dataSource": "Historical-Backfill",
    "lastUpdateTime": "2026-03-30T12:00:00Z",
    "updateDelayMinutes": 0,
    "expectedRecords": 680000,
    "actualRecords": 678500,
    "validationsPassed": 678000,
    "validationsFailed": 500,
    "errorCount": 500,
    "errorSample": "Missing volume data for ABCD on 2023-05-15"
  }'
```

## Storage Optimization

### Compression Strategy
For historical data, consider:

1. **Parquet Files** (for cold storage)
   - Store data older than 1 year in Parquet format
   - Keep recent data in MongoDB for fast queries
   - Reduce storage costs by 80-90%

2. **Data Tiering**
   ```
   Hot tier (0-6 months):   MongoDB (fast queries)
   Warm tier (6-12 months): MongoDB (indexed)
   Cold tier (>12 months):  Parquet in S3 (batch queries)
   ```

3. **Field Selection**
   ```typescript
   // Don't store every field for all historical records
   // Recent data (< 1 month): All fields
   // Historical data (> 1 month): Essential fields only (OHLC, volume)
   ```

## Post-Backfill: Daily Updates

After backfill, switch to incremental updates:

### Cron Job Setup (Vercel Cron)
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/daily-update",
      "schedule": "0 17 * * 1-5"
    }
  ]
}
```

### Daily Update Script
```typescript
// app/api/cron/daily-update/route.ts
export async function GET(request: NextRequest) {
  const today = new Date()
  
  // 1. Fetch today's stock data from IDX API
  const stocks = await fetchIDXStockData(today)
  
  // 2. Update daily facts
  for (const stock of stocks) {
    await prisma.dailyFact.upsert({
      where: {
        ticker_date: { ticker: stock.ticker, date: today }
      },
      update: stock,
      create: stock
    })
  }
  
  // 3. Calculate technical indicators
  await updateTechnicalIndicators(today)
  
  // 4. Update AI scores
  await generateAIScores(today)
  
  // 5. Record data quality
  await recordQualityMetrics(today)
  
  return NextResponse.json({ success: true })
}
```

## Rollback Procedures

If backfill fails or data is incorrect:

### Delete by Date Range
```bash
curl -X DELETE "http://localhost:3000/api/daily-facts?ticker=BBCA&startDate=2023-01-01&endDate=2023-12-31"
```

### Delete All Daily Facts (Nuclear Option)
```typescript
// Use with caution!
await prisma.dailyFact.deleteMany({
  where: {
    date: { gte: new Date('2023-01-01') }
  }
})
```

## Success Metrics

✅ **Completeness:**
- All active stocks have ≥ 700 days of data (3 years)
- < 1% missing data points

✅ **Accuracy:**
- Price data matches IDX official records
- No negative prices or volumes
- Price changes < 50% per day (except special events)

✅ **Performance:**
- API queries return results in < 500ms
- Backfill processes 10,000 records/minute

## Next Steps

After backfill is complete:

1. **Integrate with Screener:** Update stock detail pages to show historical charts
2. **Add Chart Components:** Create candlestick charts with technical indicators
3. **Enable Historical Analysis:** Add "View History" feature in UI
4. **Set Up Alerting:** Monitor daily update job failures

---

**Completed:** 2026-03-30  
**Assignee:** Data Engineer (GitHub Copilot)  
**Sprint:** 3 - Research Data Pipeline  
**Epic:** EPIC-03
