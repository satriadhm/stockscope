'use client';

import React, { useState } from 'react';
import { X, Sparkles, Check } from 'lucide-react';
import Link from 'next/link';
import type { PlanTier, FeatureGate } from '@/lib/feature-gates';
import { FEATURE_GATES } from '@/lib/feature-gates';

export interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: FeatureGate;
  requiredPlan: PlanTier;
  currentPlan: PlanTier;
  upgradeMessage?: string;
}

/**
 * Modal prompting user to upgrade
 */
export function UpgradeModal({
  isOpen,
  onClose,
  feature,
  requiredPlan,
  currentPlan,
  upgradeMessage,
}: UpgradeModalProps) {
  if (!isOpen) return null;
  
  const planLabels = {
    free: 'Free',
    premium: 'Premium',
    pro: 'Pro',
  };
  
  const planColors = {
    free: 'text-slate-600',
    premium: 'text-blue-600',
    pro: 'text-purple-600',
  };
  
  const featureConfig = feature ? FEATURE_GATES[feature] : null;
  const message = upgradeMessage || featureConfig?.upgradeMessage || 
    `Upgrade to ${planLabels[requiredPlan]} to unlock this feature`;
  
  const planBenefits = {
    premium: [
      'AI-powered insights',
      'Ownership data',
      'Up to 20 watchlists',
      '100 stocks per watchlist',
      'Up to 10 price alerts',
      '20 saved screeners',
      'Priority support',
    ],
    pro: [
      'Everything in Premium',
      'Unlimited watchlists',
      'Unlimited stocks per list',
      'Up to 100 price alerts',
      'Unlimited saved screeners',
      'Full API access',
      'Custom webhooks',
      'Historical data export',
      '24/7 dedicated support',
    ],
  };
  
  const benefits = planBenefits[requiredPlan as 'premium' | 'pro'] || [];
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
    >
      <div 
        className="relative w-full max-w-lg bg-background rounded-xl shadow-2xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-accent transition-colors"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>
        
        {/* Header */}
        <div className="p-6 pb-4 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className={`${planColors[requiredPlan]} h-6 w-6`} />
            <h2 
              id="upgrade-modal-title"
              className="text-2xl font-bold"
            >
              Upgrade to {planLabels[requiredPlan]}
            </h2>
          </div>
          <p className="text-muted-foreground">
            {message}
          </p>
        </div>
        
        {/* Benefits list */}
        <div className="px-6 pb-6 space-y-3">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-start gap-3">
              <Check className={`${planColors[requiredPlan]} shrink-0 mt-0.5`} size={18} />
              <span className="text-sm">{benefit}</span>
            </div>
          ))}
        </div>
        
        {/* CTA */}
        <div className="p-6 pt-4 bg-accent/30 border-t border-border space-y-3">
          <Link href="/pricing" onClick={onClose}>
            <button
              className={`w-full px-6 py-3 text-white font-medium rounded-lg transition-colors ${
                requiredPlan === 'premium' 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              View Pricing Plans
            </button>
          </Link>
          
          <p className="text-xs text-center text-muted-foreground">
            Cancel anytime. No commitments.
          </p>
        </div>
      </div>
    </div>
  );
}

export interface CompactUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  ctaText?: string;
  ctaHref?: string;
}

/**
 * Compact version without plan details
 */
export function CompactUpgradeModal({
  isOpen,
  onClose,
  title,
  description,
  ctaText = 'View Plans',
  ctaHref = '/pricing',
}: CompactUpgradeModalProps) {
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="relative w-full max-w-sm bg-background rounded-xl shadow-2xl border border-border p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-accent transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>
        
        <div className="space-y-2 pr-8">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        
        <Link href={ctaHref} onClick={onClose}>
          <button className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
            {ctaText}
          </button>
        </Link>
      </div>
    </div>
  );
}
