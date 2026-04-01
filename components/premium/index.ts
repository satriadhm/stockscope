/**
 * Premium Access Control Components
 * 
 * This module provides React components for implementing feature gates
 * and premium access controls on the frontend.
 * 
 * @module components/premium
 */

export { BlurOverlay, BlurOverlayWithGradient } from './BlurOverlay';
export type { BlurOverlayProps, BlurOverlayWithGradientProps } from './BlurOverlay';

export { UpgradeModal, CompactUpgradeModal } from './UpgradeModal';
export type { UpgradeModalProps, CompactUpgradeModalProps } from './UpgradeModal';

export { LockedBadge, CompactLockedBadge } from './LockedBadge';
export type { LockedBadgeProps, CompactLockedBadgeProps } from './LockedBadge';

export { 
  FeatureGate, 
  InlineFeatureGate, 
  FeatureGateWrapper 
} from './FeatureGate';
export type { 
  FeatureGateProps, 
  InlineFeatureGateProps, 
  FeatureGateWrapperProps 
} from './FeatureGate';
