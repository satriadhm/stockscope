'use client';

import React, { useState } from 'react';
import type { FeatureGate as FeatureGateType } from '@/lib/feature-gates';
import { useFeatureAccess } from '@/hooks/use-feature-access';
import { BlurOverlay } from './BlurOverlay';
import { UpgradeModal } from './UpgradeModal';
import { LockedBadge } from './LockedBadge';
import { Lock } from 'lucide-react';

export interface FeatureGateProps {
  feature: FeatureGateType;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  mode?: 'blur' | 'hide' | 'overlay';
  showUpgradeButton?: boolean;
  blurIntensity?: 'sm' | 'md' | 'lg';
}

/**
 * Main wrapper component for feature-gating content
 * 
 * @example
 * ```tsx
 * // Blur mode (default)
 * <FeatureGate feature="stocks:ownership">
 *   <OwnershipChart data={data} />
 * </FeatureGate>
 * 
 * // Hide mode with custom fallback
 * <FeatureGate feature="ai:insights" mode="hide" fallback={<EmptyState />}>
 *   <AIInsights />
 * </FeatureGate>
 * 
 * // Overlay mode with upgrade button
 * <FeatureGate feature="api:access" mode="overlay" showUpgradeButton>
 *   <ApiDocsSection />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({
  feature,
  children,
  fallback,
  mode = 'blur',
  showUpgradeButton = true,
  blurIntensity = 'md',
}: FeatureGateProps) {
  const { hasAccess, userPlan, requiredPlan, upgradeMessage, ctaText } = useFeatureAccess(feature);
  const [showModal, setShowModal] = useState(false);
  
  // User has access - render normally
  if (hasAccess) {
    return <>{children}</>;
  }
  
  // Hide mode - show fallback or nothing
  if (mode === 'hide') {
    return <>{fallback || null}</>;
  }
  
  // Blur mode - blur content with upgrade CTA
  if (mode === 'blur') {
    return (
      <div className="relative">
        <BlurOverlay blur={blurIntensity}>
          {children}
        </BlurOverlay>
        
        {showUpgradeButton && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg transition-colors"
            >
              <Lock size={16} />
              {ctaText}
            </button>
          </div>
        )}
        
        <UpgradeModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          feature={feature}
          requiredPlan={requiredPlan}
          currentPlan={userPlan}
          upgradeMessage={upgradeMessage}
        />
      </div>
    );
  }
  
  // Overlay mode - show overlay banner on top of content
  if (mode === 'overlay') {
    return (
      <div className="relative">
        {children}
        
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="space-y-2">
            <LockedBadge plan={requiredPlan} size="lg" />
            <p className="text-sm text-muted-foreground max-w-md">
              {upgradeMessage}
            </p>
          </div>
          
          {showUpgradeButton && (
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              {ctaText}
            </button>
          )}
        </div>
        
        <UpgradeModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          feature={feature}
          requiredPlan={requiredPlan}
          currentPlan={userPlan}
          upgradeMessage={upgradeMessage}
        />
      </div>
    );
  }
  
  return <>{children}</>;
}

export interface InlineFeatureGateProps {
  feature: FeatureGateType;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Inline version - just shows/hides without blur or modal
 * Useful for menu items, buttons, etc.
 */
export function InlineFeatureGate({
  feature,
  children,
  fallback,
}: InlineFeatureGateProps) {
  const { hasAccess } = useFeatureAccess(feature);
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  return <>{fallback || null}</>;
}

export interface FeatureGateWrapperProps {
  feature: FeatureGateType;
  children: React.ReactNode;
  showBadge?: boolean;
}

/**
 * Wrapper that adds locked badge to children if user doesn't have access
 * Useful for buttons, tabs, etc.
 */
export function FeatureGateWrapper({
  feature,
  children,
  showBadge = true,
}: FeatureGateWrapperProps) {
  const { hasAccess, requiredPlan } = useFeatureAccess(feature);
  
  if (hasAccess || !showBadge) {
    return <>{children}</>;
  }
  
  return (
    <div className="inline-flex items-center gap-2">
      {children}
      <LockedBadge plan={requiredPlan} size="sm" />
    </div>
  );
}
