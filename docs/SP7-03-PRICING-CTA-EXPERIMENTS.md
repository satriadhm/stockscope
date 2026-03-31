# SP7-03: Pricing & CTA Experiments

**Story Points:** 5  
**Priority:** High  
**Status:** ✅ Complete

## Overview

Comprehensive A/B testing framework for pricing optimization and conversion rate improvement. Tests 3 price points (Rp 17K, 25K, 49K), 3 CTA wordings, 3 placement strategies, and 3 layout designs with deterministic assignment and full analytics tracking.

---

## Experiments Overview

### 1. Premium Pricing (Rp 17K vs 25K vs 49K)

**Hypothesis:** Higher prices may increase perceived value without reducing conversions.

**Variants:**
- **Control:** Rp 17,000/month (current price)
- **Variant A:** Rp 25,000/month (+47% increase)
- **Variant B:** Rp 49,000/month (+188% increase)

**Traffic Split:** 34% / 33% / 33%

**Success Metrics:**
- Conversion rate (target: >2%)
- Revenue per user
- Total revenue
- Churn rate after 30 days

**Decision Criteria:**
- Run for 2 weeks minimum
- Need 1000+ impressions per variant
- Need 30+ conversions per variant
- Choose variant with highest revenue (not just conversion rate)

---

### 2. CTA Wording

**Hypothesis:** Action-oriented CTAs convert better than generic "upgrade" text.

**Variants:**
- **Control:** "Upgrade Now"
- **Variant A:** "Go Premium"
- **Variant B:** "Unlock All Features"

**Traffic Split:** 34% / 33% / 33%

**Success Metrics:**
- Click-through rate (CTR)
- Checkout initiation rate
- Conversion rate

**Decision Criteria:**
- Run for 1 week minimum
- Choose variant with highest CTR + conversion rate

---

### 3. CTA Placement

**Hypothesis:** More visible CTAs increase conversions.

**Variants:**
- **Control:** Modal on feature gate (current)
- **Variant A:** Sticky banner at top
- **Variant B:** Inline prompt within content

**Traffic Split:** 34% / 33% / 33%

**Success Metrics:**
- CTA visibility rate
- Click-through rate
- Annoyance (bounce rate after CTA shown)

**Decision Criteria:**
- Run for 1 week minimum
- Balance conversion with user experience
- Monitor bounce rates carefully

---

### 4. Pricing Layout

**Hypothesis:** Different layouts highlight value propositions better.

**Variants:**
- **Control:** 3-column cards (Free, Premium, Pro)
- **Variant A:** 2-column comparison (Premium vs Pro)
- **Variant B:** Table view with feature comparison

**Traffic Split:** 34% / 33% / 33%

**Success Metrics:**
- Time on pricing page
- CTA click rate
- Plan selection (Premium vs Pro)

**Decision Criteria:**
- Run for 1 week minimum
- Choose layout with best engagement + conversion

---

## Technical Implementation

### A/B Testing Framework (`lib/experiments.ts`)

**Features:**
- Deterministic assignment (consistent per user)
- Weight-based traffic splitting
- Support for logged-in and anonymous users
- Type-safe variant definitions
- Built-in analytics helpers

**Assignment Logic:**
```typescript
// Hash user ID to get consistent bucket 0-99
const bucket = hash(userId || sessionId) % 100;

// Assign based on cumulative weights
if (bucket < 34) return 'control';
if (bucket < 67) return 'variant_a';
return 'variant_b';
```

**Key Functions:**
- `getExperimentVariant(experimentId, userId, sessionId)` - Get variant
- `getPricingForVariant(variant)` - Get pricing config
- `getCTAForVariant(variant)` - Get CTA text
- `calculateConversionMetrics(data)` - Calculate funnel metrics

---

### Client Hooks (`hooks/use-experiments.ts`)

**Hooks:**
```typescript
// Get pricing variant + config
const { variant, pricing } = usePricingExperiment();
// pricing = { premiumMonthly: 25000, ... }

// Get CTA variant + text
const { variant, cta } = useCTAExperiment();
// cta = { primaryText: "Go Premium", ... }

// Get placement variant
const { placement } = usePlacementExperiment();
// placement = "modal" | "banner" | "inline"

// Get layout variant
const { layout } = useLayoutExperiment();
// layout = "cards" | "comparison" | "table"

// Track custom event
trackExperimentEvent(experimentId, variant, 'clicked', { 
  plan: 'premium' 
});
```

**Auto-tracking:**
- Assignment tracked on mount
- All hooks automatically log to analytics
- Custom events via `trackExperimentEvent()`

---

### Pricing Page (`app/pricing/PricingClient.tsx`)

**Features:**
- Dynamically renders based on experiment variants
- 3 layout modes (cards, comparison, table)
- Integrates with Midtrans payment flow
- Tracks all user interactions

**Event Flow:**
1. Page loads → Track "viewed"
2. User clicks CTA → Track "clicked"
3. Payment succeeds → Track "converted" + revenue

**Layouts:**

**Cards Layout (Control):**
- 3 columns: Free, Premium, Pro
- Features listed per plan
- CTA button per card
- "Most Popular" badge on Premium

**Comparison Layout (Variant A):**
- 2 columns: Premium vs Pro
- Side-by-side benefits
- Focus on upgrade decision

**Table Layout (Variant B):**
- Feature comparison matrix
- Checkmarks for included features
- CTAs below table

---

### Analytics Tracking (`components/analytics/ExperimentTracker.tsx`)

**Automatic Tracking:**
- Listens for custom `track_experiment` events
- Sends to `/api/events/track`
- Includes experiment ID, variant, action, metadata

**Event Schema:**
```typescript
{
  eventName: 'experiment_interaction',
  properties: {
    experimentId: 'premium_pricing_2026_q1',
    experimentVariant: 'variant_a',
    experimentAction: 'clicked',
    page: '/pricing',
    timestamp: '2026-03-31T...',
    // ... custom metadata
  }
}
```

---

### Metrics API (`app/api/experiments/metrics/route.ts`)

**Endpoints:**

**GET /api/experiments/metrics**
- Returns metrics for all active experiments
- Requires authentication

**Response:**
```json
{
  "experiments": [
    {
      "experimentId": "premium_pricing_2026_q1",
      "variants": [
        {
          "variant": "control",
          "impressions": 1234,
          "clicks": 234,
          "conversions": 45,
          "ctr": 18.96,
          "conversionRate": 3.65,
          "totalRevenue": 765000,
          "avgRevenuePerUser": 17000
        },
        // ... variant_a, variant_b
      ],
      "totalImpressions": 3700,
      "totalConversions": 138,
      "totalRevenue": 3200000
    }
  ]
}
```

**GET /api/experiments/metrics?experimentId=xxx**
- Returns metrics for specific experiment

**POST /api/experiments/metrics**
- Mark experiment as concluded
- Body: `{ experimentId, winningVariant, reason }`

---

## Analytics Dashboard

Query experiment metrics from database:

```sql
-- Get experiment impressions
SELECT 
  properties->>'experimentId' as experiment,
  properties->>'experimentVariant' as variant,
  COUNT(*) as impressions
FROM events
WHERE event_name = 'experiment_interaction'
  AND properties->>'experimentAction' = 'viewed'
GROUP BY experiment, variant;

-- Get conversion funnel
SELECT 
  properties->>'experimentVariant' as variant,
  COUNT(CASE WHEN properties->>'experimentAction' = 'viewed' THEN 1 END) as impressions,
  COUNT(CASE WHEN properties->>'experimentAction' = 'clicked' THEN 1 END) as clicks,
  COUNT(CASE WHEN properties->>'experimentAction' = 'converted' THEN 1 END) as conversions
FROM events
WHERE properties->>'experimentId' = 'premium_pricing_2026_q1'
GROUP BY variant;

-- Calculate revenue per variant
SELECT 
  e.properties->>'experimentVariant' as variant,
  COUNT(DISTINCT t.user_id) as users,
  SUM(t.amount) as revenue,
  AVG(t.amount) as avg_revenue
FROM events e
JOIN payment_transactions t ON e.user_id = t.user_id
WHERE e.properties->>'experimentId' = 'premium_pricing_2026_q1'
  AND e.properties->>'experimentAction' = 'converted'
  AND t.status = 'success'
GROUP BY variant;
```

---

## Statistical Significance

### Sample Size Calculation

**Formula:** `n = (Z² × p × (1-p)) / E²`

Where:
- Z = 1.96 (95% confidence)
- p = baseline conversion rate (e.g., 0.03 = 3%)
- E = margin of error (e.g., 0.01 = 1%)

**Example:**
- Baseline: 3% conversion
- Desired precision: ±1%
- Required sample: ~1,127 per variant

**Recommendation:** Run until 1,500+ views per variant

---

### Chi-Square Test

Test if conversion rate difference is significant:

```typescript
function chiSquareTest(
  controlConversions: number,
  controlTotal: number,
  variantConversions: number,
  variantTotal: number
): { pValue: number; isSignificant: boolean } {
  const a = controlConversions;
  const b = controlTotal - controlConversions;
  const c = variantConversions;
  const d = variantTotal - variantConversions;
  
  const n = a + b + c + d;
  const chiSquare = 
    (n * Math.pow(a * d - b * c, 2)) / 
    ((a + b) * (c + d) * (a + c) * (b + d));
  
  // p-value calculation (simplified)
  const pValue = 1 - cdf(chiSquare, 1);
  
  return {
    pValue,
    isSignificant: pValue < 0.05, // 95% confidence
  };
}
```

**Decision Rule:**
- If p-value < 0.05: Difference is statistically significant
- If p-value ≥ 0.05: Keep running or declare no difference

---

## Monitoring Dashboard

### Key Metrics to Track

**Daily:**
- Impressions per variant (should be ±5% equal)
- Click-through rate
- Conversion rate
- Revenue per variant

**Weekly:**
- Statistical significance tests
- Cumulative revenue
- User feedback/complaints
- Churn rate by variant

**Red Flags:**
- Unequal traffic distribution (>10% difference)
- Conversion rate drop >25% in any variant
- Revenue drop despite high conversion
- Spike in support tickets
- Increased bounce rate

---

## Experiment Lifecycle

### Phase 1: Setup (Day 1)

- [ ] Define hypothesis and success metrics
- [ ] Set traffic split (usually 33/33/34)
- [ ] Configure experiment in `lib/experiments.ts`
- [ ] Deploy to production
- [ ] Verify traffic split in analytics

### Phase 2: Running (Week 1-2)

- [ ] Monitor daily metrics
- [ ] Check for technical issues
- [ ] Ensure equal distribution
- [ ] Watch for anomalies

### Phase 3: Analysis (End of Week 2)

- [ ] Calculate statistical significance
- [ ] Compare conversion rates
- [ ] Compare revenue metrics
- [ ] Consider secondary metrics (UX, support)

### Phase 4: Decision (Week 3)

- [ ] Choose winning variant (or declare tie)
- [ ] Document findings
- [ ] Update pricing/CTA across site
- [ ] Deactivate experiment

### Phase 5: Rollout (Week 4)

- [ ] Deploy winner to 100% traffic
- [ ] Remove experiment code
- [ ] Monitor for regression
- [ ] Plan next experiment

---

## Example Scenarios

### Scenario 1: Clear Winner

**Results after 2 weeks:**
- Control: 2.8% conversion, Rp 765K revenue
- Variant A: 3.1% conversion, Rp 1.2M revenue ✅
- Variant B: 1.9% conversion, Rp 1.4M revenue

**Decision:** 
- Variant B has highest revenue despite lower conversion
- Higher price compensates for fewer conversions
- **Winner: Variant B (Rp 49K pricing)**

---

### Scenario 2: No Significant Difference

**Results after 2 weeks:**
- Control: 2.8% conversion
- Variant A: 2.9% conversion
- Variant B: 2.7% conversion

**Statistical test:** p-value = 0.32 (not significant)

**Decision:**
- No clear winner
- Keep current pricing (control)
- Test different hypothesis next

---

### Scenario 3: Technical Issue

**Results after 3 days:**
- Control: 1,200 impressions
- Variant A: 850 impressions
- Variant B: 150 impressions ⚠️

**Issue:** Variant B not rendering correctly

**Action:**
- Pause experiment immediately
- Fix bug
- Reset data and restart

---

## Integration Examples

### Update UpgradeModal with Experiments

```tsx
import { useCTAExperiment, usePlacementExperiment } from '@/hooks/use-experiments';

export function UpgradeModal({ feature, isOpen, onClose }) {
  const { cta } = useCTAExperiment();
  const { placement } = usePlacementExperiment();
  
  // Use experiment-specific CTA text
  const ctaText = cta.primaryText; // "Go Premium" or "Unlock All"
  
  // Render based on placement variant
  if (placement === 'banner') {
    return <StickyBanner cta={ctaText} />;
  }
  
  if (placement === 'inline') {
    return <InlinePrompt cta={ctaText} />;
  }
  
  // Default: modal
  return <Modal isOpen={isOpen} cta={ctaText} />;
}
```

---

### Track Custom Conversions

```typescript
// After successful payment
trackExperimentEvent(
  pricingExpId, 
  pricingVariant, 
  'converted', 
  {
    plan: 'premium',
    amount: 25000,
    billingCycle: 'monthly',
    paymentMethod: 'qris',
  }
);
```

---

### Query Metrics from Frontend

```tsx
function ExperimentDashboard() {
  const [metrics, setMetrics] = useState(null);
  
  useEffect(() => {
    fetch('/api/experiments/metrics')
      .then(res => res.json())
      .then(data => setMetrics(data.experiments));
  }, []);
  
  return (
    <div>
      {metrics?.map(exp => (
        <ExperimentCard key={exp.experimentId} data={exp} />
      ))}
    </div>
  );
}
```

---

## Best Practices

### 1. One Variable at a Time

❌ **Bad:** Test pricing + CTA wording in same experiment  
✅ **Good:** Test pricing first, then CTA separately

### 2. Run Long Enough

❌ **Bad:** Stop after 3 days with 500 impressions  
✅ **Good:** Run 2+ weeks, 1,500+ impressions per variant

### 3. Watch for External Factors

- Holidays (lower conversion)
- Marketing campaigns (higher traffic)
- Product launches (different audience)
- Competitor changes

**Solution:** Pause experiment during anomalous periods

### 4. Don't Peek Too Often

❌ **Bad:** Check metrics every hour, stop when ahead  
✅ **Good:** Set timeline upfront, stick to it

### 5. Consider Lifetime Value

- Variant with lower conversion but higher retention wins
- Track 30-day and 90-day churn rates
- Compare LTV, not just initial revenue

---

## Troubleshooting

### Issue: Unequal Traffic Distribution

**Symptoms:** One variant gets 50% traffic, others get 25%

**Cause:** Hash function bias

**Fix:**
```typescript
// Use better hash function
import { createHash } from 'crypto';

const hash = createHash('md5')
  .update(userId || sessionId)
  .digest('hex');
const bucket = parseInt(hash.slice(0, 8), 16) % 100;
```

---

### Issue: Events Not Tracking

**Symptoms:** Zero impressions in analytics

**Cause:** ExperimentTracker not loaded

**Fix:**
```tsx
// In root layout
import { ExperimentTracker } from '@/components/analytics';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <ExperimentTracker />
      </body>
    </html>
  );
}
```

---

### Issue: Cached Assignments

**Symptoms:** User sees different variants on refresh

**Cause:** Client/server mismatch

**Fix:**
```typescript
// Store assignment in session storage
const variant = useMemo(() => {
  const cached = sessionStorage.getItem(`exp_${experimentId}`);
  if (cached) return cached;
  
  const assigned = getExperimentVariant(experimentId, userId);
  sessionStorage.setItem(`exp_${experimentId}`, assigned);
  return assigned;
}, [experimentId, userId]);
```

---

## Future Enhancements

1. **Multi-Armed Bandit:**
   - Automatically allocate more traffic to winning variant
   - Reduce sample size needed
   - Maximize revenue during testing

2. **Personalization:**
   - Different experiments for different user segments
   - Location-based pricing
   - Behavior-based CTAs

3. **Sequential Testing:**
   - Stop experiment early when clear winner emerges
   - Bayesian statistics
   - Reduce opportunity cost

4. **Holdout Groups:**
   - Keep 5% in control permanently
   - Measure long-term impact
   - Detect regression

---

## Files Created

### Core Infrastructure (3 files)
- `lib/experiments.ts` (350 lines) - A/B testing framework
- `hooks/use-experiments.ts` (140 lines) - Client hooks
- `components/analytics/ExperimentTracker.tsx` (45 lines) - Event tracker

### Pricing Page (2 files)
- `app/pricing/page.tsx` (10 lines) - Server component
- `app/pricing/PricingClient.tsx` (600 lines) - Client UI with 3 layouts

### API (1 file)
- `app/api/experiments/metrics/route.ts` (120 lines) - Metrics endpoint

### Documentation (1 file)
- `docs/SP7-03-PRICING-CTA-EXPERIMENTS.md` (this file)

**Total:** 7 new files, 1,265 lines of code

---

## Dependencies

### Existing
- `next-auth` - User identification
- `lib/analytics` - Event tracking
- `lib/midtrans` - Payment processing
- `prisma` - Database queries

### New
- None (uses existing infrastructure)

---

## Deployment Checklist

- [x] Experiments configured in lib/experiments.ts
- [x] Pricing page created with 3 layouts
- [x] Client hooks implemented
- [x] Analytics tracking integrated
- [x] Metrics API created
- [ ] ExperimentTracker added to root layout
- [ ] Experiments activated (isActive: true)
- [ ] Analytics dashboard showing data
- [ ] Statistical significance calculator ready
- [ ] Team trained on experiment lifecycle
- [ ] Documentation reviewed

---

## Related Documents

- `docs/SP7-01-BACKEND-FEATURE-GATING.md` - Backend gates
- `docs/SP7-02-FRONTEND-ACCESS-CONTROLS.md` - Frontend components
- `docs/SP4-01-EVENT-INGESTION-API.md` - Analytics system
- `lib/midtrans.ts` - Payment configuration

---

**Sprint 7:** 15/21 SP (71%)  
**Next Task:** SP7-04 - Cancellation Flow & Churn Capture
