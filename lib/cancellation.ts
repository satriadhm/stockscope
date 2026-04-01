/**
 * Cancellation Flow Configuration
 * SP7-04: Cancellation Flow & Churn Capture
 * 
 * Handles subscription cancellations with survey, retention offers,
 * and feedback capture to reduce churn.
 */

export type CancellationReason = 
  | 'too_expensive'
  | 'not_using_enough'
  | 'missing_features'
  | 'technical_issues'
  | 'found_alternative'
  | 'temporary_need'
  | 'other';

export type RetentionOffer = 
  | 'discount_25'
  | 'discount_50'
  | 'pause_1month'
  | 'pause_3months'
  | 'downgrade_free'
  | 'none';

export interface CancellationSurvey {
  reason: CancellationReason;
  specificFeedback?: string;
  wouldConsiderReturning: boolean;
  satisfactionScore?: number; // 1-5
}

export interface CancellationFeedback {
  userId: string;
  plan: string;
  cancelledAt: Date;
  survey: CancellationSurvey;
  retentionOfferShown?: RetentionOffer;
  retentionOfferAccepted: boolean;
  finalAction: 'cancelled' | 'retained' | 'paused' | 'downgraded';
}

// =============================================================================
// CANCELLATION REASONS
// =============================================================================

export const CANCELLATION_REASONS: Record<CancellationReason, {
  label: string;
  description: string;
  icon: string;
  retentionOffer?: RetentionOffer;
}> = {
  too_expensive: {
    label: 'Too expensive',
    description: 'The price is higher than I can afford',
    icon: '💰',
    retentionOffer: 'discount_50',
  },
  not_using_enough: {
    label: 'Not using it enough',
    description: "I don't use Stockscope frequently",
    icon: '⏰',
    retentionOffer: 'pause_3months',
  },
  missing_features: {
    label: 'Missing features',
    description: 'Stockscope lacks features I need',
    icon: '🔧',
  },
  technical_issues: {
    label: 'Technical problems',
    description: 'Experiencing bugs or performance issues',
    icon: '⚠️',
  },
  found_alternative: {
    label: 'Found an alternative',
    description: 'Switching to a different service',
    icon: '🔄',
  },
  temporary_need: {
    label: 'Temporary need only',
    description: 'I only needed this for a short time',
    icon: '📅',
    retentionOffer: 'pause_1month',
  },
  other: {
    label: 'Other reason',
    description: 'Something else (please specify)',
    icon: '💬',
  },
};

// =============================================================================
// RETENTION OFFERS
// =============================================================================

export const RETENTION_OFFERS: Record<RetentionOffer, {
  title: string;
  description: string;
  cta: string;
  discount?: number; // percentage
  pauseDuration?: number; // months
  savings?: string;
}> = {
  discount_25: {
    title: '25% Off for 3 Months',
    description: 'Stay subscribed and save 25% for the next 3 months',
    cta: 'Accept Discount',
    discount: 25,
    savings: 'Save Rp 13K over 3 months',
  },
  discount_50: {
    title: '50% Off for 3 Months',
    description: 'We understand! Get 50% off for 3 months to help with costs',
    cta: 'Accept 50% Discount',
    discount: 50,
    savings: 'Save Rp 25K over 3 months',
  },
  pause_1month: {
    title: 'Pause for 1 Month',
    description: 'Take a break without cancelling. Resume anytime.',
    cta: 'Pause Subscription',
    pauseDuration: 1,
  },
  pause_3months: {
    title: 'Pause for 3 Months',
    description: 'Pause your subscription for 3 months. No charges during pause.',
    cta: 'Pause for 3 Months',
    pauseDuration: 3,
  },
  downgrade_free: {
    title: 'Downgrade to Free',
    description: 'Keep using basic features without paying',
    cta: 'Switch to Free Plan',
  },
  none: {
    title: 'No retention offer',
    description: '',
    cta: '',
  },
};

// =============================================================================
// RETENTION LOGIC
// =============================================================================

/**
 * Get retention offer based on cancellation reason
 */
export function getRetentionOffer(reason: CancellationReason): RetentionOffer {
  const reasonConfig = CANCELLATION_REASONS[reason];
  return reasonConfig.retentionOffer || 'downgrade_free';
}

/**
 * Calculate discount amount
 */
export function calculateDiscountAmount(
  originalPrice: number,
  retentionOffer: RetentionOffer
): number {
  const offer = RETENTION_OFFERS[retentionOffer];
  if (!offer.discount) return 0;
  
  return Math.round(originalPrice * (offer.discount / 100));
}

/**
 * Get discounted price
 */
export function getDiscountedPrice(
  originalPrice: number,
  retentionOffer: RetentionOffer
): number {
  return originalPrice - calculateDiscountAmount(originalPrice, retentionOffer);
}

// =============================================================================
// CANCELLATION INSIGHTS
// =============================================================================

export interface ChurnInsights {
  topReasons: Array<{ reason: CancellationReason; count: number; percentage: number }>;
  retentionRate: number; // % who accepted offer
  averageSatisfaction: number; // 1-5 scale
  totalCancellations: number;
  totalRetained: number;
}

/**
 * Analyze cancellation feedback to get insights
 */
export function analyzeChurnFeedback(
  feedbacks: CancellationFeedback[]
): ChurnInsights {
  const totalCancellations = feedbacks.length;
  const totalRetained = feedbacks.filter(f => f.retentionOfferAccepted).length;
  
  // Count reasons
  const reasonCounts = new Map<CancellationReason, number>();
  let totalSatisfaction = 0;
  let satisfactionCount = 0;
  
  for (const feedback of feedbacks) {
    const reason = feedback.survey.reason;
    reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
    
    if (feedback.survey.satisfactionScore) {
      totalSatisfaction += feedback.survey.satisfactionScore;
      satisfactionCount++;
    }
  }
  
  // Sort by count
  const topReasons = Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: (count / totalCancellations) * 100,
    }))
    .sort((a, b) => b.count - a.count);
  
  return {
    topReasons,
    retentionRate: totalCancellations > 0 
      ? (totalRetained / totalCancellations) * 100 
      : 0,
    averageSatisfaction: satisfactionCount > 0 
      ? totalSatisfaction / satisfactionCount 
      : 0,
    totalCancellations,
    totalRetained,
  };
}

// =============================================================================
// WIN-BACK CAMPAIGNS
// =============================================================================

export interface WinBackCampaign {
  segmentName: string;
  targetReason: CancellationReason;
  message: string;
  offer: string;
  waitDays: number; // Days after cancellation
}

export const WIN_BACK_CAMPAIGNS: WinBackCampaign[] = [
  {
    segmentName: 'Price Sensitive',
    targetReason: 'too_expensive',
    message: "We've lowered our prices! Premium is now more affordable.",
    offer: '3 months at 50% off',
    waitDays: 30,
  },
  {
    segmentName: 'Low Usage',
    targetReason: 'not_using_enough',
    message: 'Check out our new features that save you time!',
    offer: '1 month free trial',
    waitDays: 60,
  },
  {
    segmentName: 'Technical Issues',
    targetReason: 'technical_issues',
    message: "We've fixed the bugs! Come back and see the improvements.",
    offer: '2 weeks free + priority support',
    waitDays: 14,
  },
];

/**
 * Get appropriate win-back campaign for cancelled user
 */
export function getWinBackCampaign(
  reason: CancellationReason,
  daysSinceCancellation: number
): WinBackCampaign | null {
  const campaign = WIN_BACK_CAMPAIGNS.find(
    c => c.targetReason === reason && daysSinceCancellation >= c.waitDays
  );
  
  return campaign || null;
}
