/**
 * A/B Testing Framework for Pricing & CTA Experiments
 * SP7-03: Pricing & CTA Experiments
 * 
 * Provides deterministic experiment assignment based on user ID
 * with analytics tracking and conversion measurement.
 */

export type ExperimentVariant = 'control' | 'variant_a' | 'variant_b';

export interface Experiment {
  id: string;
  name: string;
  description: string;
  variants: ExperimentConfig[];
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

export interface ExperimentConfig {
  id: ExperimentVariant;
  weight: number; // 0-100, sum must be 100
  label: string;
}

export interface ExperimentAssignment {
  experimentId: string;
  variant: ExperimentVariant;
  timestamp: string;
}

// =============================================================================
// ACTIVE EXPERIMENTS
// =============================================================================

export const PRICING_EXPERIMENTS = {
  // Experiment 1: Premium Plan Pricing
  premiumPricing: {
    id: 'premium_pricing_2026_q1',
    name: 'Premium Plan Pricing Test',
    description: 'Test 3 price points for Premium plan',
    isActive: true,
    variants: [
      { id: 'control' as ExperimentVariant, weight: 34, label: 'Rp 17,000/mo' },
      { id: 'variant_a' as ExperimentVariant, weight: 33, label: 'Rp 25,000/mo' },
      { id: 'variant_b' as ExperimentVariant, weight: 33, label: 'Rp 49,000/mo' },
    ],
  },

  // Experiment 2: CTA Wording
  ctaWording: {
    id: 'cta_wording_2026_q1',
    name: 'Upgrade CTA Wording Test',
    description: 'Test different CTA button text',
    isActive: true,
    variants: [
      { id: 'control' as ExperimentVariant, weight: 34, label: 'Upgrade Now' },
      { id: 'variant_a' as ExperimentVariant, weight: 33, label: 'Go Premium' },
      { id: 'variant_b' as ExperimentVariant, weight: 33, label: 'Unlock All Features' },
    ],
  },

  // Experiment 3: CTA Placement
  ctaPlacement: {
    id: 'cta_placement_2026_q1',
    name: 'CTA Placement Test',
    description: 'Test different CTA placement strategies',
    isActive: true,
    variants: [
      { id: 'control' as ExperimentVariant, weight: 34, label: 'Modal on gate' },
      { id: 'variant_a' as ExperimentVariant, weight: 33, label: 'Sticky banner' },
      { id: 'variant_b' as ExperimentVariant, weight: 33, label: 'Inline prompt' },
    ],
  },

  // Experiment 4: Pricing Page Layout
  pricingLayout: {
    id: 'pricing_layout_2026_q1',
    name: 'Pricing Page Layout Test',
    description: 'Test different pricing page designs',
    isActive: true,
    variants: [
      { id: 'control' as ExperimentVariant, weight: 34, label: '3-column cards' },
      { id: 'variant_a' as ExperimentVariant, weight: 33, label: '2-column comparison' },
      { id: 'variant_b' as ExperimentVariant, weight: 33, label: 'Table view' },
    ],
  },
} as const;

// =============================================================================
// EXPERIMENT ASSIGNMENT
// =============================================================================

/**
 * Deterministic experiment assignment based on user ID
 * Uses simple hash to ensure consistency
 */
export function getExperimentVariant(
  experimentId: string,
  userId?: string,
  sessionId?: string
): ExperimentVariant {
  const experiment = Object.values(PRICING_EXPERIMENTS).find(e => e.id === experimentId);
  
  if (!experiment || !experiment.isActive) {
    return 'control';
  }
  
  // Use userId for logged-in, sessionId for anonymous
  const seed = userId || sessionId || 'anonymous';
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Get positive number 0-99
  const bucket = Math.abs(hash) % 100;
  
  // Assign based on weights
  let cumulative = 0;
  for (const variant of experiment.variants) {
    cumulative += variant.weight;
    if (bucket < cumulative) {
      return variant.id;
    }
  }
  
  return 'control';
}

/**
 * Get all active experiment assignments for a user
 */
export function getAllExperimentAssignments(
  userId?: string,
  sessionId?: string
): Record<string, ExperimentVariant> {
  const assignments: Record<string, ExperimentVariant> = {};
  
  for (const [key, experiment] of Object.entries(PRICING_EXPERIMENTS)) {
    if (experiment.isActive) {
      assignments[key] = getExperimentVariant(experiment.id, userId, sessionId);
    }
  }
  
  return assignments;
}

// =============================================================================
// PRICING CONFIGURATION
// =============================================================================

export interface PricingConfig {
  premiumMonthly: number;
  premiumAnnual: number;
  proMonthly: number;
  proAnnual: number;
  adminFee: number;
  currency: 'IDR';
  annualDiscount: number; // percentage
}

/**
 * Get pricing config based on experiment variant
 */
export function getPricingForVariant(variant: ExperimentVariant): PricingConfig {
  const basePricing: Record<ExperimentVariant, PricingConfig> = {
    control: {
      premiumMonthly: 17_000,
      premiumAnnual: 170_000, // ~16% discount
      proMonthly: 149_000,
      proAnnual: 1_490_000, // ~16% discount
      adminFee: 1_000,
      currency: 'IDR',
      annualDiscount: 16,
    },
    variant_a: {
      premiumMonthly: 25_000,
      premiumAnnual: 250_000, // ~16% discount
      proMonthly: 149_000,
      proAnnual: 1_490_000,
      adminFee: 1_000,
      currency: 'IDR',
      annualDiscount: 16,
    },
    variant_b: {
      premiumMonthly: 49_000,
      premiumAnnual: 490_000, // ~16% discount
      proMonthly: 149_000,
      proAnnual: 1_490_000,
      adminFee: 1_000,
      currency: 'IDR',
      annualDiscount: 16,
    },
  };
  
  return basePricing[variant];
}

// =============================================================================
// CTA CONFIGURATION
// =============================================================================

export interface CTAConfig {
  primaryText: string;
  secondaryText: string;
  tooltipText: string;
}

/**
 * Get CTA text based on experiment variant
 */
export function getCTAForVariant(variant: ExperimentVariant): CTAConfig {
  const ctaConfig: Record<ExperimentVariant, CTAConfig> = {
    control: {
      primaryText: 'Upgrade Now',
      secondaryText: 'View Plans',
      tooltipText: 'Upgrade to unlock premium features',
    },
    variant_a: {
      primaryText: 'Go Premium',
      secondaryText: 'See Premium Benefits',
      tooltipText: 'Go Premium to access all features',
    },
    variant_b: {
      primaryText: 'Unlock All Features',
      secondaryText: 'See What You Get',
      tooltipText: 'Unlock all features with Premium',
    },
  };
  
  return ctaConfig[variant];
}

// =============================================================================
// ANALYTICS TRACKING
// =============================================================================

export interface ExperimentEventProps {
  experimentId: string;
  variant: ExperimentVariant;
  action: 'assigned' | 'viewed' | 'clicked' | 'converted';
  metadata?: Record<string, any>;
}

/**
 * Track experiment event
 * Should be called from client-side using analytics tracker
 */
export function getExperimentEventPayload(props: ExperimentEventProps) {
  return {
    eventName: 'experiment_interaction',
    experimentId: props.experimentId,
    experimentVariant: props.variant,
    experimentAction: props.action,
    ...props.metadata,
  };
}

// =============================================================================
// CONVERSION TRACKING
// =============================================================================

export interface ConversionMetrics {
  experimentId: string;
  variant: ExperimentVariant;
  
  // Funnel stages
  impressions: number;    // How many saw the pricing
  clicks: number;         // How many clicked CTA
  checkouts: number;      // How many initiated checkout
  conversions: number;    // How many completed payment
  
  // Conversion rates
  ctr: number;            // clicks / impressions
  checkoutRate: number;   // checkouts / clicks
  conversionRate: number; // conversions / impressions
  
  // Revenue
  totalRevenue: number;
  avgRevenuePerUser: number;
}

/**
 * Calculate conversion metrics
 * This would typically query from analytics database
 */
export function calculateConversionMetrics(
  experimentId: string,
  variant: ExperimentVariant,
  data: {
    impressions: number;
    clicks: number;
    checkouts: number;
    conversions: number;
    totalRevenue: number;
  }
): ConversionMetrics {
  const { impressions, clicks, checkouts, conversions, totalRevenue } = data;
  
  return {
    experimentId,
    variant,
    impressions,
    clicks,
    checkouts,
    conversions,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    checkoutRate: clicks > 0 ? (checkouts / clicks) * 100 : 0,
    conversionRate: impressions > 0 ? (conversions / impressions) * 100 : 0,
    totalRevenue,
    avgRevenuePerUser: conversions > 0 ? totalRevenue / conversions : 0,
  };
}

// =============================================================================
// EXPERIMENT UTILITIES
// =============================================================================

/**
 * Check if user is in experiment
 */
export function isInExperiment(
  experimentId: string,
  userId?: string,
  sessionId?: string
): boolean {
  const experiment = Object.values(PRICING_EXPERIMENTS).find(e => e.id === experimentId);
  return experiment?.isActive || false;
}

/**
 * Get experiment label for variant
 */
export function getVariantLabel(experimentId: string, variant: ExperimentVariant): string {
  const experiment = Object.values(PRICING_EXPERIMENTS).find(e => e.id === experimentId);
  const variantConfig = experiment?.variants.find(v => v.id === variant);
  return variantConfig?.label || variant;
}

/**
 * Format price in IDR
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
