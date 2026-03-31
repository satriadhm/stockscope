// Feature Gate Configuration
// Defines which features require which plan tiers

export type PlanTier = 'free' | 'premium' | 'pro';

export type FeatureGate = 
  // Data Access Features
  | 'stocks:basic'
  | 'stocks:ownership'
  | 'stocks:financials'
  | 'stocks:historical'
  
  // Screener Features
  | 'screener:basic'
  | 'screener:advanced'
  | 'screener:custom'
  | 'screener:saved'
  
  // Personalization Features
  | 'watchlist:basic'
  | 'watchlist:unlimited'
  | 'alerts:basic'
  | 'alerts:advanced'
  
  // AI Features
  | 'ai:insights'
  | 'ai:predictions'
  | 'ai:recommendations'
  
  // API Features
  | 'api:access'
  | 'api:webhooks'
  
  // Export Features
  | 'export:csv'
  | 'export:excel'
  | 'export:api';

// =============================================================================
// FEATURE GATE DEFINITIONS
// =============================================================================

export interface FeatureConfig {
  feature: FeatureGate;
  requiredPlan: PlanTier;
  description: string;
  upgradeMessage: string;
}

export const FEATURE_GATES: Record<FeatureGate, FeatureConfig> = {
  // Basic features (Free tier)
  'stocks:basic': {
    feature: 'stocks:basic',
    requiredPlan: 'free',
    description: 'Access basic stock data (price, volume, market cap)',
    upgradeMessage: 'Available on all plans',
  },
  
  'screener:basic': {
    feature: 'screener:basic',
    requiredPlan: 'free',
    description: 'Use stock screener with basic filters',
    upgradeMessage: 'Available on all plans',
  },
  
  'watchlist:basic': {
    feature: 'watchlist:basic',
    requiredPlan: 'free',
    description: 'Create up to 3 watchlists with 20 stocks each',
    upgradeMessage: 'Available on all plans',
  },
  
  'screener:saved': {
    feature: 'screener:saved',
    requiredPlan: 'free',
    description: 'Save up to 3 screener configurations',
    upgradeMessage: 'Available on all plans',
  },
  
  // Premium features
  'stocks:ownership': {
    feature: 'stocks:ownership',
    requiredPlan: 'premium',
    description: 'View institutional ownership data',
    upgradeMessage: 'Upgrade to Premium to access ownership data',
  },
  
  'stocks:financials': {
    feature: 'stocks:financials',
    requiredPlan: 'premium',
    description: 'Access financial statements and ratios',
    upgradeMessage: 'Upgrade to Premium to view financial statements',
  },
  
  'screener:advanced': {
    feature: 'screener:advanced',
    requiredPlan: 'premium',
    description: 'Use advanced screener filters (ownership, financials)',
    upgradeMessage: 'Upgrade to Premium for advanced screening',
  },
  
  'watchlist:unlimited': {
    feature: 'watchlist:unlimited',
    requiredPlan: 'premium',
    description: 'Create unlimited watchlists with unlimited stocks',
    upgradeMessage: 'Upgrade to Premium for unlimited watchlists',
  },
  
  'alerts:basic': {
    feature: 'alerts:basic',
    requiredPlan: 'premium',
    description: 'Set up to 10 price alerts',
    upgradeMessage: 'Upgrade to Premium to create price alerts',
  },
  
  'ai:insights': {
    feature: 'ai:insights',
    requiredPlan: 'premium',
    description: 'Get AI-powered stock insights',
    upgradeMessage: 'Upgrade to Premium for AI insights',
  },
  
  'export:csv': {
    feature: 'export:csv',
    requiredPlan: 'premium',
    description: 'Export screener results to CSV',
    upgradeMessage: 'Upgrade to Premium to export data',
  },
  
  // Pro features
  'stocks:historical': {
    feature: 'stocks:historical',
    requiredPlan: 'pro',
    description: 'Access 5+ years of historical price data',
    upgradeMessage: 'Upgrade to Pro for historical data',
  },
  
  'screener:custom': {
    feature: 'screener:custom',
    requiredPlan: 'pro',
    description: 'Create custom screener formulas',
    upgradeMessage: 'Upgrade to Pro for custom screeners',
  },
  
  'alerts:advanced': {
    feature: 'alerts:advanced',
    requiredPlan: 'pro',
    description: 'Set up to 100 alerts with complex conditions',
    upgradeMessage: 'Upgrade to Pro for advanced alerts',
  },
  
  'ai:predictions': {
    feature: 'ai:predictions',
    requiredPlan: 'pro',
    description: 'Get AI price predictions',
    upgradeMessage: 'Upgrade to Pro for AI predictions',
  },
  
  'ai:recommendations': {
    feature: 'ai:recommendations',
    requiredPlan: 'pro',
    description: 'Get personalized AI recommendations',
    upgradeMessage: 'Upgrade to Pro for AI recommendations',
  },
  
  'api:access': {
    feature: 'api:access',
    requiredPlan: 'pro',
    description: 'Access Stockscope API',
    upgradeMessage: 'Upgrade to Pro for API access',
  },
  
  'api:webhooks': {
    feature: 'api:webhooks',
    requiredPlan: 'pro',
    description: 'Configure webhooks for real-time updates',
    upgradeMessage: 'Upgrade to Pro for webhooks',
  },
  
  'export:excel': {
    feature: 'export:excel',
    requiredPlan: 'pro',
    description: 'Export to Excel with formatting',
    upgradeMessage: 'Upgrade to Pro for Excel export',
  },
  
  'export:api': {
    feature: 'export:api',
    requiredPlan: 'pro',
    description: 'Export via API',
    upgradeMessage: 'Upgrade to Pro for API export',
  },
};

// =============================================================================
// PLAN TIER HIERARCHY
// =============================================================================

const PLAN_HIERARCHY: Record<PlanTier, number> = {
  free: 0,
  premium: 1,
  pro: 2,
};

// =============================================================================
// FEATURE GATE UTILITIES
// =============================================================================

/**
 * Check if a plan tier has access to a feature
 */
export function hasFeatureAccess(
  userPlan: PlanTier,
  feature: FeatureGate
): boolean {
  const featureConfig = FEATURE_GATES[feature];
  const userPlanLevel = PLAN_HIERARCHY[userPlan];
  const requiredPlanLevel = PLAN_HIERARCHY[featureConfig.requiredPlan];
  
  return userPlanLevel >= requiredPlanLevel;
}

/**
 * Get all features available for a plan tier
 */
export function getAvailableFeatures(plan: PlanTier): FeatureGate[] {
  return (Object.keys(FEATURE_GATES) as FeatureGate[]).filter((feature) =>
    hasFeatureAccess(plan, feature)
  );
}

/**
 * Get features that would be unlocked by upgrading to a plan
 */
export function getUpgradeFeatures(
  currentPlan: PlanTier,
  targetPlan: PlanTier
): FeatureGate[] {
  const currentFeatures = getAvailableFeatures(currentPlan);
  const targetFeatures = getAvailableFeatures(targetPlan);
  
  return targetFeatures.filter((f) => !currentFeatures.includes(f));
}

/**
 * Get the minimum plan required for a feature
 */
export function getRequiredPlan(feature: FeatureGate): PlanTier {
  return FEATURE_GATES[feature].requiredPlan;
}

/**
 * Get upgrade message for a feature
 */
export function getUpgradeMessage(feature: FeatureGate): string {
  return FEATURE_GATES[feature].upgradeMessage;
}

/**
 * Get feature description
 */
export function getFeatureDescription(feature: FeatureGate): string {
  return FEATURE_GATES[feature].description;
}

/**
 * Check if plan is valid
 */
export function isValidPlan(plan: string): plan is PlanTier {
  return plan === 'free' || plan === 'premium' || plan === 'pro';
}

/**
 * Get plan display name
 */
export function getPlanDisplayName(plan: PlanTier): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

// =============================================================================
// PLAN LIMITS
// =============================================================================

export interface PlanLimits {
  watchlists: number; // Max watchlists
  watchlistStocks: number; // Max stocks per watchlist
  savedScreeners: number; // Max saved screeners
  alerts: number; // Max price alerts
  apiRequests: number; // Requests per hour
  historicalDataYears: number; // Years of historical data
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    watchlists: 3,
    watchlistStocks: 20,
    savedScreeners: 3,
    alerts: 0,
    apiRequests: 0,
    historicalDataYears: 0,
  },
  premium: {
    watchlists: 20,
    watchlistStocks: 100,
    savedScreeners: 20,
    alerts: 10,
    apiRequests: 0,
    historicalDataYears: 1,
  },
  pro: {
    watchlists: -1, // Unlimited
    watchlistStocks: -1, // Unlimited
    savedScreeners: -1, // Unlimited
    alerts: 100,
    apiRequests: 10000,
    historicalDataYears: 10,
  },
};

/**
 * Get limits for a plan
 */
export function getPlanLimits(plan: PlanTier): PlanLimits {
  return PLAN_LIMITS[plan];
}

/**
 * Check if user has reached a limit
 */
export function hasReachedLimit(
  plan: PlanTier,
  limitType: keyof PlanLimits,
  currentCount: number
): boolean {
  const limits = getPlanLimits(plan);
  const limit = limits[limitType];
  
  // -1 means unlimited
  if (limit === -1) return false;
  
  return currentCount >= limit;
}

/**
 * Get remaining quota for a limit
 */
export function getRemainingQuota(
  plan: PlanTier,
  limitType: keyof PlanLimits,
  currentCount: number
): number {
  const limits = getPlanLimits(plan);
  const limit = limits[limitType];
  
  // -1 means unlimited
  if (limit === -1) return Infinity;
  
  return Math.max(0, limit - currentCount);
}
