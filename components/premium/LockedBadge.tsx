'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import type { PlanTier } from '@/lib/feature-gates';

export interface LockedBadgeProps {
  plan: PlanTier;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

/**
 * Badge indicating a feature requires a specific plan
 * 
 * @example
 * ```tsx
 * <button>
 *   AI Insights
 *   <LockedBadge plan="premium" />
 * </button>
 * ```
 */
export function LockedBadge({ 
  plan, 
  size = 'sm', 
  showText = true,
  className = '' 
}: LockedBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-2.5 py-1.5',
  };
  
  const iconSizes = {
    sm: 10,
    md: 12,
    lg: 14,
  };
  
  const planColors = {
    free: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    premium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    pro: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  };
  
  const planLabels = {
    free: 'Free',
    premium: 'Premium',
    pro: 'Pro',
  };
  
  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${sizeClasses[size]}
        ${planColors[plan]}
        ${className}
      `}
      aria-label={`Requires ${planLabels[plan]} plan`}
    >
      <Lock size={iconSizes[size]} className="shrink-0" />
      {showText && <span>{planLabels[plan]}</span>}
    </span>
  );
}

export interface CompactLockedBadgeProps {
  plan: PlanTier;
  className?: string;
}

/**
 * Compact version - just lock icon with tooltip
 */
export function CompactLockedBadge({ plan, className = '' }: CompactLockedBadgeProps) {
  const planLabels = {
    free: 'Free',
    premium: 'Premium',
    pro: 'Pro',
  };
  
  return (
    <span
      className={`inline-flex items-center ${className}`}
      title={`Requires ${planLabels[plan]} plan`}
      aria-label={`Requires ${planLabels[plan]} plan`}
    >
      <Lock size={14} className="text-muted-foreground" />
    </span>
  );
}
