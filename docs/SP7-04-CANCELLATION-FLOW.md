# SP7-04: Cancellation Flow & Churn Capture

**Sprint:** 7 - Paywall & Growth  
**Story Points:** 3  
**Status:** ✅ COMPLETE  
**Date:** January 4, 2026

---

## Overview

Built a complete subscription cancellation flow with retention offers and comprehensive churn analytics. The system captures cancellation reasons, presents targeted retention offers, and stores feedback for analysis.

## Architecture

### Components

#### 1. **Cancellation Logic Library** (`lib/cancellation.ts`)
- 280 lines of business logic
- 7 cancellation reasons with retention mapping
- 5 retention offer types
- Churn analysis utilities
- Win-back campaign definitions

#### 2. **CancellationFlow Component** (`components/cancellation/CancellationFlow.tsx`)
- 400+ lines modal-based flow
- 4 sequential steps with state management
- Glassmorphic overlay design
- Keyboard navigation support

#### 3. **API Routes**
- **POST /api/subscription/cancel** - Process cancellation
- **POST /api/subscription/retention** - Accept retention offer

#### 4. **Database Schema**
- **CancellationFeedback** model - Churn data capture
- **User** model extensions - Retention state tracking

---

## Cancellation Reasons & Retention Mapping

```typescript
const CANCELLATION_REASONS = {
  too_expensive: {
    id: 'too_expensive',
    label: 'Too expensive',
    retentionOffers: ['discount_25', 'discount_50', 'downgrade_free'],
  },
  not_using: {
    id: 'not_using',
    label: 'Not using the features',
    retentionOffers: ['pause_1month', 'downgrade_free'],
  },
  missing_features: {
    id: 'missing_features',
    label: 'Missing features I need',
    retentionOffers: [], // No retention, collect feedback
  },
  technical_issues: {
    id: 'technical_issues',
    label: 'Technical issues',
    retentionOffers: ['pause_1month'], // Fix issues first
  },
  found_alternative: {
    id: 'found_alternative',
    label: 'Found a better alternative',
    retentionOffers: ['discount_25'], // Light retention attempt
  },
  temporary_break: {
    id: 'temporary_break',
    label: 'Taking a break',
    retentionOffers: ['pause_1month', 'pause_3month'],
  },
  other: {
    id: 'other',
    label: 'Other reason',
    retentionOffers: [],
  },
};
```

### Retention Offer Strategy

| Offer ID | Type | Benefit | Duration | Best For |
|----------|------|---------|----------|----------|
| `discount_25` | Discount | 25% off | 3 months | Price-sensitive users |
| `discount_50` | Discount | 50% off | 3 months | High churn risk |
| `pause_1month` | Pause | Skip 1 payment | 1 month | Temporary break |
| `pause_3month` | Pause | Skip 3 payments | 3 months | Extended break |
| `downgrade_free` | Downgrade | Free plan access | Permanent | Light users |

---

## 4-Step Flow Design

### Step 1: Survey
**Purpose:** Understand why user is cancelling

**UI:**
- Radio button list of cancellation reasons
- Optional text area for "other" reason
- 1-5 satisfaction score slider
- "Would you consider returning?" checkbox

**Validation:**
- Requires reason selection
- Specific feedback required if "other" selected

### Step 2: Retention Offer
**Purpose:** Present targeted offer to save subscription

**Logic:**
```typescript
const retentionOffer = getRetentionOffer(survey.reason);
if (!retentionOffer) {
  // Skip to confirmation (no retention for missing_features/other)
  setStep('confirm');
}
```

**UI:**
- Highlight card with offer details
- Clear value proposition
- "Accept Offer" (primary) vs "Continue Cancelling" (secondary)

**Offer Display:**
- **Discount:** "Save 25% for 3 months!"
- **Pause:** "Take a 1-month break, resume anytime"
- **Downgrade:** "Keep basic features for free"

### Step 3: Confirmation
**Purpose:** Final confirmation before cancellation

**UI:**
- Warning message: "Are you sure?"
- List of features being lost
- "Yes, Cancel" (destructive) vs "Keep Subscription" (primary)

**Copy:**
```
You'll lose access to:
• Advanced stock screeners
• Ownership data & AI insights
• Price alerts & watchlists
• Historical data API
```

### Step 4: Complete
**Purpose:** Graceful exit with win-back opportunity

**UI:**
- Success message
- Feedback thank you
- Re-engagement CTA: "We'd love to have you back"
- Email signup for feature updates

---

## API Endpoints

### POST /api/subscription/cancel

**Request:**
```typescript
{
  survey: {
    reason: CancellationReason,
    specificFeedback?: string,
    satisfactionScore?: number, // 1-5
    wouldConsiderReturning: boolean,
  },
  retentionOfferShown?: RetentionOffer,
  retentionOfferAccepted: boolean,
}
```

**Response:**
```typescript
{
  success: true,
  message: "Subscription cancelled successfully"
}
```

**Actions:**
1. Store cancellation feedback in `cancellationFeedback` collection
2. Update user plan to "free"
3. Set `cancelledAt` timestamp
4. Track `subscription_cancelled` event

**Error Handling:**
- 401: Not authenticated
- 404: User not found
- 500: Database error

---

### POST /api/subscription/retention

**Request:**
```typescript
{
  survey: CancellationSurvey,
  retentionOffer: RetentionOffer,
  accepted: boolean,
}
```

**Response (accepted):**
```typescript
{
  success: true,
  message: "Retention offer applied successfully",
  offer: {
    type: "discount_25",
    discount: 25,
    pauseDuration: null
  }
}
```

**Actions (if accepted):**
1. Apply retention offer:
   - **Discount:** Set `discountPercent` + `discountExpiresAt` (3 months)
   - **Pause:** Set `pausedUntil` (1 or 3 months)
   - **Downgrade:** Change plan to "free"
2. Store feedback with `finalAction: "retained"`
3. Track `subscription_retained` event

**Actions (if declined):**
1. Store feedback with `finalAction: "cancelled"`
2. Return `success: false`

---

## Database Schema

### CancellationFeedback Model

```prisma
model CancellationFeedback {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  userId    String   @db.ObjectId
  plan      String // Plan at time of cancellation
  
  // Survey data
  cancelledAt          DateTime @default(now())
  reason               String // Primary cancellation reason
  specificFeedback     String? // Additional details
  wouldConsiderReturning Boolean @default(false)
  satisfactionScore    Int? // 1-5 scale
  
  // Retention tracking
  retentionOfferShown  Json? // Which retention offer was shown
  retentionOfferAccepted Boolean @default(false)
  finalAction          String // "cancelled", "retained", "paused"
  
  createdAt DateTime @default(now())
  
  @@index([userId])
  @@index([cancelledAt])
  @@index([reason])
  @@index([finalAction])
  @@map("cancellation_feedback")
}
```

**Indexes:**
- `userId` - User's cancellation history
- `cancelledAt` - Time-series churn analysis
- `reason` - Most common cancellation reasons
- `finalAction` - Retention success rate

### User Model Extensions

```prisma
model User {
  // ... existing fields
  
  // Subscription management (Sprint 7)
  cancelledAt       DateTime?
  discountPercent   Int? // Retention discount percentage
  discountExpiresAt DateTime? // When discount expires
  pausedUntil       DateTime? // Subscription pause end date
}
```

**New Fields:**
- `cancelledAt` - Last cancellation timestamp
- `discountPercent` - Active retention discount (0-100)
- `discountExpiresAt` - Discount expiration date
- `pausedUntil` - Resume date for paused subscriptions

---

## Churn Analysis Utilities

### analyzeChurnFeedback()

**Purpose:** Aggregate cancellation reasons and retention success

**Output:**
```typescript
{
  totalCancellations: 247,
  retentionRate: 34, // % who accepted offers
  topReasons: [
    { reason: 'too_expensive', count: 89, percentage: 36 },
    { reason: 'not_using', count: 62, percentage: 25 },
    { reason: 'found_alternative', count: 41, percentage: 17 },
  ],
  avgSatisfactionScore: 3.2,
  wouldReturnPercentage: 58,
  offerEffectiveness: {
    discount_25: { shown: 120, accepted: 45, rate: 37.5 },
    discount_50: { shown: 50, accepted: 28, rate: 56.0 },
    pause_1month: { shown: 60, accepted: 22, rate: 36.7 },
  }
}
```

**Use Cases:**
- Product team: Identify feature gaps
- Growth team: Optimize retention offers
- Support team: Proactive outreach targets

### getHighRiskUsers()

**Purpose:** Identify users likely to churn

**Signals:**
- Low engagement (< 5 logins/month)
- No premium feature usage (last 30 days)
- Support tickets with unresolved issues
- Payment failures in past

**Output:** List of userId + risk score

---

## Win-Back Campaign Definitions

### Campaign 1: Feature Update
**Target:** `reason: 'missing_features'`  
**Trigger:** 30 days after cancellation  
**Message:** "We added the features you requested!"

### Campaign 2: Price Drop
**Target:** `reason: 'too_expensive'`  
**Trigger:** 60 days after cancellation  
**Offer:** 40% lifetime discount

### Campaign 3: We Miss You
**Target:** `wouldConsiderReturning: true`  
**Trigger:** 90 days after cancellation  
**Offer:** 1 month free trial

### Campaign 4: Annual Plan
**Target:** `reason: 'temporary_break'`  
**Trigger:** When `pausedUntil` expires  
**Offer:** Switch to annual plan (2 months free)

---

## Events Tracked

### subscription_cancelled
**When:** User completes cancellation flow  
**Properties:**
```typescript
{
  previousPlan: "premium",
  cancellationReason: "too_expensive",
  retentionOfferShown: "discount_25",
  retentionOfferAccepted: false
}
```

### subscription_retained
**When:** User accepts retention offer  
**Properties:**
```typescript
{
  retentionOffer: "discount_25",
  cancellationReason: "too_expensive"
}
```

---

## Integration with Existing System

### User Plan Management
- **Before Cancellation:** `user.plan = "premium"`
- **After Cancellation:** `user.plan = "free"`
- **After Retention (discount):** `user.plan = "premium"` + `discountPercent = 25`
- **After Retention (pause):** `user.plan = "premium"` + `pausedUntil = Date`

### Feature Gating (SP7-02)
```typescript
// Check if user has access despite retention state
if (user.pausedUntil && user.pausedUntil > new Date()) {
  // Allow premium access during pause
  return true;
}
```

### Billing System (Sprint 5)
- **Discount:** Reduce next payment by `discountPercent`
- **Pause:** Skip payments until `pausedUntil`
- **Downgrade:** Cancel subscription, keep user account

---

## Usage Example

```typescript
import { CancellationFlow } from '@/components/cancellation';

function AccountSettings() {
  const [showCancellation, setShowCancellation] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowCancellation(true)}>
        Cancel Subscription
      </button>
      
      {showCancellation && (
        <CancellationFlow
          onClose={() => setShowCancellation(false)}
          onComplete={(retained) => {
            if (retained) {
              toast.success('Retention offer applied!');
            } else {
              toast.info('Subscription cancelled');
              router.push('/');
            }
          }}
        />
      )}
    </>
  );
}
```

---

## Key Metrics to Monitor

### Retention Metrics
- **Retention Rate:** % who accept offers (target: >30%)
- **Offer Effectiveness:** Conversion by offer type
- **Churn Rate:** Cancellations / active users (target: <5%/month)

### Feedback Metrics
- **Top Cancellation Reasons:** Weekly trending
- **Satisfaction Score:** Track over time
- **Would Return:** % open to win-back

### Financial Impact
- **Saved MRR:** Revenue retained via offers
- **Discount Cost:** Total discount amount given
- **Pause Revenue:** Deferred revenue from pauses

---

## Build Output

```
✓ Compiled successfully in 44s
✓ 51 routes compiled

New Routes:
  /api/subscription/cancel
  /api/subscription/retention
```

**Files Created:**
- `lib/cancellation.ts` (280 lines)
- `components/cancellation/CancellationFlow.tsx` (400 lines)
- `components/cancellation/index.ts` (5 lines)
- `app/api/subscription/cancel/route.ts` (98 lines)
- `app/api/subscription/retention/route.ts` (135 lines)

**Files Modified:**
- `prisma/schema.prisma` - Added CancellationFeedback model + User fields

**Total:** 918 lines of code added

---

## Next Steps

1. **SP7-05: Hypercare with Rollback Triggers** (3 SP)
   - Monitor conversion, churn, support tickets
   - Define rollback triggers
   - Incident response plan

2. **Future Enhancements:**
   - Automated win-back email campaigns
   - Churn prediction ML model
   - A/B test retention offer amounts
   - Exit survey for free users

---

## Success Criteria

- ✅ Cancellation flow captures reason + satisfaction
- ✅ Retention offers dynamically shown based on reason
- ✅ Discounts/pauses applied to user account
- ✅ All feedback stored in database
- ✅ Events tracked for analytics
- ✅ Build passing with TypeScript
- ✅ API endpoints secured with auth
- ✅ Graceful error handling

---

**Status:** Ready for production deployment  
**Next Sprint Task:** SP7-05 - Hypercare monitoring setup
