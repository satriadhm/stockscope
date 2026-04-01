# SP2-01: Watchlists & Items APIs

**Status:** ✅ COMPLETE  
**Sprint:** Sprint 2 - User-Owned Data  
**Story Points:** 8 SP  
**Completed:** March 30, 2026

## Overview

RESTful APIs for managing user watchlists and their stock items. Enables users to:
- Create multiple named watchlists
- Add/remove stocks to watchlists
- Reorder stocks via drag-and-drop
- Delete watchlists (cascade deletes items)

## API Endpoints

### 1. List Watchlists

**GET /api/watchlists**

Lists all watchlists for the authenticated user, ordered by position.

**Auth:** Required (NextAuth session)

**Response:** 200 OK
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "name": "Tech Favorites",
    "description": "Indonesian tech leaders",
    "color": "#4edea3",
    "position": 0,
    "createdAt": "2026-03-30T10:00:00Z",
    "updatedAt": "2026-03-30T10:00:00Z",
    "itemCount": 5,
    "tickers": ["BBCA", "BMRI", "TLKM", "ASII", "UNVR"]
  }
]
```

**Errors:**
- 401 Unauthorized - No valid session

---

### 2. Create Watchlist

**POST /api/watchlists**

Creates a new watchlist for the authenticated user.

**Auth:** Required

**Body:**
```json
{
  "name": "Growth Stocks",
  "description": "High-growth JKSE stocks",
  "color": "#ffb4ab"
}
```

**Validation:**
- `name` (required): 1-100 characters, non-empty after trim
- `description` (optional): max 500 characters
- `color` (optional): hex color for UI categorization

**Response:** 201 Created
```json
{
  "id": "507f1f77bcf86cd799439012",
  "userId": "507f1f77bcf86cd799439010",
  "name": "Growth Stocks",
  "description": "High-growth JKSE stocks",
  "color": "#ffb4ab",
  "position": 1,
  "createdAt": "2026-03-30T10:05:00Z",
  "updatedAt": "2026-03-30T10:05:00Z"
}
```

**Errors:**
- 400 Bad Request - Invalid name/description length
- 401 Unauthorized - No valid session
- 404 Not Found - User not found in database

---

### 3. Get Watchlist

**GET /api/watchlists/[id]**

Fetches a single watchlist with all its items, ordered by position.

**Auth:** Required (must be owner)

**Response:** 200 OK
```json
{
  "id": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439010",
  "name": "Tech Favorites",
  "description": "Indonesian tech leaders",
  "color": "#4edea3",
  "position": 0,
  "createdAt": "2026-03-30T10:00:00Z",
  "updatedAt": "2026-03-30T10:00:00Z",
  "items": [
    {
      "id": "507f1f77bcf86cd799439013",
      "watchlistId": "507f1f77bcf86cd799439011",
      "ticker": "BBCA",
      "notes": "Strong fundamentals",
      "position": 0,
      "addedAt": "2026-03-30T10:01:00Z"
    }
  ]
}
```

**Errors:**
- 401 Unauthorized - No valid session
- 403 Forbidden - User does not own this watchlist
- 404 Not Found - Watchlist not found

---

### 4. Update Watchlist

**PATCH /api/watchlists/[id]**

Updates watchlist metadata (name, description, color, position).

**Auth:** Required (must be owner)

**Body:** (all fields optional)
```json
{
  "name": "Tech Leaders (Updated)",
  "description": "Top 10 tech stocks",
  "color": "#a5d8ff",
  "position": 2
}
```

**Validation:**
- `name`: 1-100 characters if provided
- `description`: max 500 characters if provided
- `color`: hex color or null
- `position`: non-negative number

**Response:** 200 OK (updated watchlist object)

**Errors:**
- 400 Bad Request - Validation failed
- 401 Unauthorized - No valid session
- 403 Forbidden - User does not own this watchlist
- 404 Not Found - Watchlist not found

---

### 5. Delete Watchlist

**DELETE /api/watchlists/[id]**

Deletes a watchlist and all its items (cascade delete).

**Auth:** Required (must be owner)

**Response:** 200 OK
```json
{
  "success": true
}
```

**Errors:**
- 401 Unauthorized - No valid session
- 403 Forbidden - User does not own this watchlist
- 404 Not Found - Watchlist not found

---

### 6. Add Stock to Watchlist

**POST /api/watchlists/[id]/items**

Adds a stock ticker to the watchlist.

**Auth:** Required (must be owner)

**Body:**
```json
{
  "ticker": "BBCA",
  "notes": "Bank Central Asia - Strong fundamentals"
}
```

**Validation:**
- `ticker` (required): Stock ticker symbol, normalized to uppercase
- `notes` (optional): User notes about the stock
- Duplicate ticker check: returns 409 if ticker already in watchlist

**Response:** 201 Created
```json
{
  "id": "507f1f77bcf86cd799439013",
  "watchlistId": "507f1f77bcf86cd799439011",
  "ticker": "BBCA",
  "notes": "Bank Central Asia - Strong fundamentals",
  "position": 5,
  "addedAt": "2026-03-30T10:15:00Z"
}
```

**Errors:**
- 400 Bad Request - Invalid ticker
- 401 Unauthorized - No valid session
- 403 Forbidden - User does not own this watchlist
- 404 Not Found - Watchlist not found
- 409 Conflict - Ticker already in watchlist

---

### 7. Remove Stock from Watchlist

**DELETE /api/watchlists/[id]/items?ticker=BBCA**

Removes a stock from the watchlist by ticker symbol.

**Auth:** Required (must be owner)

**Query Params:**
- `ticker` (required): Stock ticker to remove (case-insensitive)

**Response:** 200 OK
```json
{
  "success": true
}
```

**Errors:**
- 400 Bad Request - Missing ticker parameter
- 401 Unauthorized - No valid session
- 403 Forbidden - User does not own this watchlist
- 404 Not Found - Watchlist or stock not found

---

### 8. Reorder Watchlist Items

**PATCH /api/watchlists/[id]/items**

Bulk updates item positions for drag-and-drop reordering.

**Auth:** Required (must be owner)

**Body:**
```json
{
  "items": [
    { "id": "507f1f77bcf86cd799439013", "position": 0 },
    { "id": "507f1f77bcf86cd799439014", "position": 1 },
    { "id": "507f1f77bcf86cd799439015", "position": 2 }
  ]
}
```

**Validation:**
- `items` must be an array
- Each item must have `id` (string) and `position` (non-negative number)
- Updates are executed in a transaction (all or nothing)

**Response:** 200 OK
```json
{
  "success": true
}
```

**Errors:**
- 400 Bad Request - Invalid items array or positions
- 401 Unauthorized - No valid session
- 403 Forbidden - User does not own this watchlist
- 404 Not Found - Watchlist not found

---

## Database Schema

### Watchlist Model

```prisma
model Watchlist {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  userId      String   @db.ObjectId
  name        String
  description String?
  color       String?  // Hex color for UI categorization
  position    Int      @default(0) // For drag-drop ordering
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  items       WatchlistItem[]
  
  @@index([userId])
  @@index([userId, position])
  @@map("watchlists")
}
```

### WatchlistItem Model

```prisma
model WatchlistItem {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  watchlistId String   @db.ObjectId
  ticker      String   // Stock ticker symbol (e.g., "BBCA", "TLKM")
  notes       String?  // User notes about the stock
  position    Int      @default(0) // For drag-drop ordering
  addedAt     DateTime @default(now())
  
  watchlist   Watchlist @relation(fields: [watchlistId], references: [id], onDelete: Cascade)
  
  @@index([watchlistId])
  @@index([watchlistId, position])
  @@map("watchlist_items")
}
```

### Relationships

- **One-to-Many:** Watchlist → WatchlistItem
- **Cascade Delete:** Deleting a watchlist deletes all its items
- **Ownership:** Watchlists belong to users via `userId` (references User model)

---

## Authentication & Authorization

### Session-Based Auth

All endpoints use NextAuth `getServerSession()`:

```typescript
const session = await getServerSession(authOptions);
if (!session?.user?.email) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### User Lookup

Users are identified by email from session:

```typescript
const user = await prisma.user.findUnique({
  where: { email: session.user.email },
});
```

### Ownership Verification

Before any write operation, verify the user owns the watchlist:

```typescript
if (watchlist.userId !== user.id) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

---

## Implementation Details

### Position Management

Items are ordered using a `position` field (0-indexed):

- **On create:** Find max position, increment by 1
- **On reorder:** Bulk update positions in transaction
- **On delete:** No position recalculation (gaps allowed)

### Duplicate Prevention

Adding a ticker that already exists returns 409 Conflict:

```typescript
const existingItem = await prisma.watchlistItem.findFirst({
  where: { watchlistId, ticker: normalizedTicker },
});

if (existingItem) {
  return NextResponse.json(
    { error: 'Stock already in watchlist' },
    { status: 409 }
  );
}
```

### Cascade Deletes

Prisma relation with `onDelete: Cascade`:

```prisma
watchlist Watchlist @relation(fields: [watchlistId], references: [id], onDelete: Cascade)
```

Deleting a watchlist automatically deletes all items.

### Bulk Position Updates

Reordering uses Prisma transaction:

```typescript
await prisma.$transaction(
  items.map((item) =>
    prisma.watchlistItem.update({
      where: { id: item.id },
      data: { position: item.position },
    })
  )
);
```

---

## Testing

### Manual Testing with curl

```bash
# 1. Create watchlist
curl -X POST http://localhost:3000/api/watchlists \
  -H "Cookie: next-auth.session-token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test List","description":"Testing"}'

# 2. Add stock
curl -X POST http://localhost:3000/api/watchlists/<id>/items \
  -H "Cookie: next-auth.session-token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"ticker":"BBCA","notes":"Bank Central Asia"}'

# 3. List watchlists
curl http://localhost:3000/api/watchlists \
  -H "Cookie: next-auth.session-token=<token>"

# 4. Get watchlist with items
curl http://localhost:3000/api/watchlists/<id> \
  -H "Cookie: next-auth.session-token=<token>"

# 5. Remove stock
curl -X DELETE "http://localhost:3000/api/watchlists/<id>/items?ticker=BBCA" \
  -H "Cookie: next-auth.session-token=<token>"

# 6. Delete watchlist
curl -X DELETE http://localhost:3000/api/watchlists/<id> \
  -H "Cookie: next-auth.session-token=<token>"
```

### E2E Tests (TODO)

Create Playwright tests for:
- Create watchlist → verify in DB
- Add multiple stocks → verify order
- Reorder items → verify position updates
- Delete watchlist → verify cascade delete

---

## Known Issues & Limitations

### 1. Prisma Version Downgrade

**Issue:** Prisma 7.6.0 requires `adapter` or `accelerateUrl` for MongoDB.

**Error:**
```
Using engine type "client" requires either "adapter" or "accelerateUrl"
to be provided to PrismaClient constructor.
```

**Solution:** Downgraded to Prisma 5.22.0 (last stable 5.x version).

**Files Changed:**
- Removed `prisma.config.ts` (Prisma 7 only)
- Restored `url = env("DATABASE_URL")` in `schema.prisma`
- Updated `package.json`: `prisma@5.22.0`, `@prisma/client@5.22.0`

**Impact:** None on functionality. Prisma 5 is stable and production-ready.

### 2. No Ticker Validation

Currently, the API accepts any ticker string without validating:
- Ticker exists in database
- Ticker is a valid JKSE stock

**Recommendation:** Add validation in SP2-03 when building the UI:
- Check against `/api/stocks` endpoint
- Show autocomplete with valid tickers
- Display error if ticker not found

### 3. No Item Limit

Users can add unlimited stocks to a watchlist.

**Recommendation:** Add limit (e.g., 50 items per watchlist) in SP2-03.

---

## Next Steps

### SP2-03: Watchlist UI (8 SP)

Build frontend components that consume these APIs:

1. **WatchlistSidebar**
   - List all watchlists
   - Create new watchlist button
   - Click to view items

2. **WatchlistDetail**
   - Display stocks in watchlist
   - Drag-and-drop reordering (calls PATCH /items)
   - Remove stock button (calls DELETE /items?ticker=X)

3. **AddToWatchlistModal**
   - Triggered from screener table or stock detail
   - Dropdown to select watchlist
   - Calls POST /items with ticker

4. **WatchlistCard** (mobile)
   - Compact card view of watchlist
   - Swipe actions (edit, delete)

### SP2-02: Saved Screeners APIs (5 SP)

Similar pattern for saving filter configurations:
- POST /api/saved-screeners (save current filters)
- GET /api/saved-screeners (list saved)
- GET /api/saved-screeners/[id] (load filters)
- DELETE /api/saved-screeners/[id]

---

## Files Created

```
app/api/watchlists/route.ts          (154 lines, GET/POST)
app/api/watchlists/[id]/route.ts     (238 lines, GET/PATCH/DELETE)
app/api/watchlists/[id]/items/route.ts (274 lines, POST/DELETE/PATCH)
docs/SP2-01-WATCHLIST-API.md         (this file)
```

## Files Modified

```
prisma/schema.prisma                 (added Watchlist & WatchlistItem models)
package.json                         (downgraded Prisma 7 → 5)
```

## Build Status

✅ **Passing** (22 routes compiled successfully)

---

**Completed by:** Claude (GitHub Copilot)  
**Review Status:** Ready for code review  
**Merge Target:** `sprint-1/foundation` → `main`
