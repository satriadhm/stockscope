'use client';

import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { 
  CANCELLATION_REASONS, 
  RETENTION_OFFERS,
  getRetentionOffer,
  getDiscountedPrice,
  type CancellationReason,
  type RetentionOffer,
  type CancellationSurvey,
} from '@/lib/cancellation';

interface CancellationFlowProps {
  isOpen: boolean;
  onClose: () => void;
  userPlan: string;
  monthlyPrice: number;
}

type FlowStep = 'survey' | 'retention' | 'confirm' | 'complete';

export function CancellationFlow({ 
  isOpen, 
  onClose, 
  userPlan,
  monthlyPrice 
}: CancellationFlowProps) {
  const [step, setStep] = useState<FlowStep>('survey');
  const [survey, setSurvey] = useState<Partial<CancellationSurvey>>({
    wouldConsiderReturning: false,
  });
  const [retentionOffer, setRetentionOffer] = useState<RetentionOffer>('none');
  const [loading, setLoading] = useState(false);
  
  if (!isOpen) return null;
  
  const handleReasonSelect = (reason: CancellationReason) => {
    setSurvey({ ...survey, reason });
    const offer = getRetentionOffer(reason);
    setRetentionOffer(offer);
    setStep('retention');
  };
  
  const handleAcceptOffer = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/subscription/retention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          survey,
          retentionOffer,
          accepted: true,
        }),
      });
      
      if (response.ok) {
        setStep('complete');
      }
    } catch (error) {
      console.error('Failed to accept retention offer:', error);
    }
    setLoading(false);
  };
  
  const handleDeclineOffer = () => {
    setStep('confirm');
  };
  
  const handleConfirmCancellation = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          survey,
          retentionOfferShown: retentionOffer,
          retentionOfferAccepted: false,
        }),
      });
      
      if (response.ok) {
        setStep('complete');
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
    }
    setLoading(false);
  };
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl bg-background rounded-xl shadow-2xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-accent transition-colors z-10"
          aria-label="Close"
        >
          <X size={20} />
        </button>
        
        {/* Content based on step */}
        {step === 'survey' && (
          <SurveyStep 
            survey={survey}
            setSurvey={setSurvey}
            onReasonSelect={handleReasonSelect}
          />
        )}
        
        {step === 'retention' && (
          <RetentionStep
            retentionOffer={retentionOffer}
            monthlyPrice={monthlyPrice}
            onAccept={handleAcceptOffer}
            onDecline={handleDeclineOffer}
            loading={loading}
          />
        )}
        
        {step === 'confirm' && (
          <ConfirmStep
            userPlan={userPlan}
            onConfirm={handleConfirmCancellation}
            onBack={() => setStep('retention')}
            loading={loading}
          />
        )}
        
        {step === 'complete' && (
          <CompleteStep
            wasRetained={step === 'complete' && retentionOffer !== 'none'}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// STEP 1: SURVEY
// =============================================================================

function SurveyStep({ 
  survey, 
  setSurvey, 
  onReasonSelect 
}: {
  survey: Partial<CancellationSurvey>;
  setSurvey: (survey: Partial<CancellationSurvey>) => void;
  onReasonSelect: (reason: CancellationReason) => void;
}) {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">We're sorry to see you go</h2>
        <p className="text-muted-foreground">
          Help us improve by telling us why you're cancelling
        </p>
      </div>
      
      {/* Reason options */}
      <div className="space-y-3 mb-6">
        {Object.entries(CANCELLATION_REASONS).map(([key, config]) => (
          <button
            key={key}
            onClick={() => onReasonSelect(key as CancellationReason)}
            className="w-full text-left p-4 rounded-lg border-2 border-border hover:border-blue-500 hover:bg-accent/50 transition-all"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{config.icon}</span>
              <div>
                <div className="font-medium">{config.label}</div>
                <div className="text-sm text-muted-foreground">{config.description}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// STEP 2: RETENTION OFFER
// =============================================================================

function RetentionStep({ 
  retentionOffer, 
  monthlyPrice,
  onAccept, 
  onDecline,
  loading,
}: {
  retentionOffer: RetentionOffer;
  monthlyPrice: number;
  onAccept: () => void;
  onDecline: () => void;
  loading: boolean;
}) {
  const offer = RETENTION_OFFERS[retentionOffer];
  
  if (retentionOffer === 'none') {
    // Skip to confirm
    onDecline();
    return null;
  }
  
  const discountedPrice = offer.discount 
    ? getDiscountedPrice(monthlyPrice, retentionOffer)
    : null;
  
  return (
    <div className="p-8">
      <div className="text-center mb-8">
        <div className="text-4xl mb-4">🎁</div>
        <h2 className="text-2xl font-bold mb-2">Wait! We have an offer for you</h2>
        <p className="text-muted-foreground">
          Before you go, we'd like to make this work for you
        </p>
      </div>
      
      {/* Offer card */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border-2 border-blue-200 dark:border-blue-800 mb-6">
        <h3 className="text-xl font-bold mb-2">{offer.title}</h3>
        <p className="text-muted-foreground mb-4">{offer.description}</p>
        
        {discountedPrice && (
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold text-blue-600">
              Rp {discountedPrice.toLocaleString()}
            </span>
            <span className="text-lg text-muted-foreground line-through">
              Rp {monthlyPrice.toLocaleString()}
            </span>
          </div>
        )}
        
        {offer.savings && (
          <div className="text-sm text-green-600 dark:text-green-400 font-medium">
            {offer.savings}
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={onAccept}
          disabled={loading}
          className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Processing...' : offer.cta}
        </button>
        
        <button
          onClick={onDecline}
          disabled={loading}
          className="w-full py-3 px-6 bg-transparent hover:bg-accent text-foreground font-medium rounded-lg transition-colors"
        >
          No thanks, continue cancelling
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// STEP 3: CONFIRM CANCELLATION
// =============================================================================

function ConfirmStep({ 
  userPlan,
  onConfirm, 
  onBack,
  loading,
}: {
  userPlan: string;
  onConfirm: () => void;
  onBack: () => void;
  loading: boolean;
}) {
  return (
    <div className="p-8">
      <div className="text-center mb-6">
        <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-orange-500" />
        <h2 className="text-2xl font-bold mb-2">Are you absolutely sure?</h2>
        <p className="text-muted-foreground">
          Cancelling will remove your access to all {userPlan} features
        </p>
      </div>
      
      {/* What you'll lose */}
      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 mb-6 border border-red-200 dark:border-red-800">
        <h3 className="font-semibold mb-3">You'll lose access to:</h3>
        <ul className="space-y-2 text-sm">
          <li>• AI-powered insights and recommendations</li>
          <li>• Ownership data and institutional tracking</li>
          <li>• Advanced screening and saved screeners</li>
          <li>• Price alerts and notifications</li>
          <li>• Priority support</li>
        </ul>
      </div>
      
      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={onConfirm}
          disabled={loading}
          className="w-full py-3 px-6 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Yes, cancel my subscription'}
        </button>
        
        <button
          onClick={onBack}
          disabled={loading}
          className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          No, keep my subscription
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// STEP 4: COMPLETE
// =============================================================================

function CompleteStep({ 
  wasRetained, 
  onClose 
}: {
  wasRetained: boolean;
  onClose: () => void;
}) {
  return (
    <div className="p-8 text-center">
      <div className="text-6xl mb-4">{wasRetained ? '🎉' : '👋'}</div>
      <h2 className="text-2xl font-bold mb-2">
        {wasRetained ? 'Welcome back!' : 'Subscription cancelled'}
      </h2>
      <p className="text-muted-foreground mb-6">
        {wasRetained 
          ? 'Your retention offer has been applied. Thank you for staying!'
          : 'Your subscription has been cancelled. You can resubscribe anytime.'}
      </p>
      
      <button
        onClick={onClose}
        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
      >
        {wasRetained ? 'Continue' : 'Close'}
      </button>
    </div>
  );
}
