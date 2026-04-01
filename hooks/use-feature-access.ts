'use client';

import { useSession } from 'next-auth/react';
import { useMemo } from 'react';
import type { FeatureGate, PlanTier } from '@/lib/feature-gates';
import { FEATURE_GATES, PLAN_HIERARCHY, hasFeatureAccess } from '@/lib/feature-gates';

export interface FeatureAccessResult {
  hasAccess: boolean;
  userPlan: PlanTier;
  requiredPlan: PlanTier;
  feature: FeatureGate;
  upgradeMessage: string;
  ctaText: string;
}

/**
 * Client-side hook for checking feature access
 * 
 * @example
 * ```tsx
 * function OwnershipChart() {
 *   const { hasAccess, upgradeMessage } = useFeatureAccess('stocks:ownership');
 *   
 *   if (!hasAccess) {
 *     return <UpgradePrompt message={upgradeMessage} />;
 *   }
 *   
 *   return <Chart data={data} />;
 * }
 * ```
 */
export function useFeatureAccess(feature: FeatureGate): FeatureAccessResult {
  const { data: session } = useSession();
  
  return useMemo(() => {
    const userPlan = (session?.user?.plan as PlanTier) || 'free';
    const config = FEATURE_GATES[feature];
    const access = hasFeatureAccess(userPlan, feature);
    
    return {
      hasAccess: access,
      userPlan,
      requiredPlan: config.requiredPlan,
      feature,
      upgradeMessage: config.upgradeMessage,
      ctaText: `Upgrade to ${config.requiredPlan.charAt(0).toUpperCase() + config.requiredPlan.slice(1)}`,
    };
  }, [feature, session?.user?.plan]);
}

/**
 * Hook to get all features available to user
 */
export function useAvailableFeatures(): FeatureGate[] {
  const { data: session } = useSession();
  const userPlan = (session?.user?.plan as PlanTier) || 'free';
  
  return useMemo(() => {
    const features: FeatureGate[] = [];
    
    for (const [feature, config] of Object.entries(FEATURE_GATES)) {
      if (hasFeatureAccess(userPlan, feature as FeatureGate)) {
        features.push(feature as FeatureGate);
      }
    }
    
    return features;
  }, [userPlan]);
}

/**
 * Hook to check if user can upgrade
 */
export function useCanUpgrade(): boolean {
  const { data: session } = useSession();
  const userPlan = (session?.user?.plan as PlanTier) || 'free';
  
  return useMemo(() => {
    const planLevel = PLAN_HIERARCHY[userPlan];
    const maxLevel = Math.max(...Object.values(PLAN_HIERARCHY));
    return planLevel < maxLevel;
  }, [userPlan]);
}

/**
 * Hook to get next plan tier
 */
export function useNextPlanTier(): PlanTier | null {
  const { data: session } = useSession();
  const userPlan = (session?.user?.plan as PlanTier) || 'free';
  
  return useMemo(() => {
    const currentLevel = PLAN_HIERARCHY[userPlan];
    
    // Find next plan tier
    for (const [plan, level] of Object.entries(PLAN_HIERARCHY)) {
      if (level === currentLevel + 1) {
        return plan as PlanTier;
      }
    }
    
    return null;
  }, [userPlan]);
}

/**
 * Hook to get features unlocked by upgrading
 */
export function useUpgradeFeatures(): FeatureGate[] {
  const { data: session } = useSession();
  const userPlan = (session?.user?.plan as PlanTier) || 'free';
  const nextPlan = useNextPlanTier();
  
  return useMemo(() => {
    if (!nextPlan) return [];
    
    const features: FeatureGate[] = [];
    
    for (const [feature, config] of Object.entries(FEATURE_GATES)) {
      const hasNow = hasFeatureAccess(userPlan, feature as FeatureGate);
      const willHave = hasFeatureAccess(nextPlan, feature as FeatureGate);
      
      if (!hasNow && willHave) {
        features.push(feature as FeatureGate);
      }
    }
    
    return features;
  }, [userPlan, nextPlan]);
}
