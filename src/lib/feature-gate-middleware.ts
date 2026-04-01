import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { 
  hasFeatureAccess, 
  getUpgradeMessage, 
  getRequiredPlan,
  getPlanDisplayName,
  type FeatureGate,
  type PlanTier,
  isValidPlan,
} from '@/lib/feature-gates';

export interface FeatureGateResult {
  allowed: boolean;
  userPlan: PlanTier;
  requiredPlan?: PlanTier;
  message?: string;
  upgradeUrl?: string;
}

/**
 * Check if authenticated user has access to a feature
 * Use this in API route handlers
 */
export async function checkFeatureGate(
  feature: FeatureGate
): Promise<FeatureGateResult> {
  // Get session
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return {
      allowed: false,
      userPlan: 'free',
      message: 'Authentication required',
    };
  }
  
  // Get user plan from session (or fetch from database if needed)
  // For now, assume session.user has a plan field
  const userPlan = (session.user as any).plan || 'free';
  
  // Validate plan
  if (!isValidPlan(userPlan)) {
    return {
      allowed: false,
      userPlan: 'free',
      message: 'Invalid plan configuration',
    };
  }
  
  // Check access
  const hasAccess = hasFeatureAccess(userPlan, feature);
  
  if (!hasAccess) {
    const requiredPlan = getRequiredPlan(feature);
    const upgradeMessage = getUpgradeMessage(feature);
    
    return {
      allowed: false,
      userPlan,
      requiredPlan,
      message: upgradeMessage,
      upgradeUrl: '/pricing',
    };
  }
  
  return {
    allowed: true,
    userPlan,
  };
}

/**
 * Middleware wrapper for feature-gated API routes
 * Returns 402 Payment Required if user doesn't have access
 */
export function withFeatureGate(feature: FeatureGate) {
  return async function featureGateMiddleware(
    req: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const result = await checkFeatureGate(feature);
    
    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'Payment Required',
          message: result.message,
          feature,
          userPlan: result.userPlan,
          requiredPlan: result.requiredPlan,
          upgradeUrl: result.upgradeUrl,
          upgrade: {
            message: `Upgrade to ${getPlanDisplayName(result.requiredPlan!)} to access this feature`,
            currentPlan: getPlanDisplayName(result.userPlan),
            targetPlan: getPlanDisplayName(result.requiredPlan!),
            ctaText: `Upgrade to ${getPlanDisplayName(result.requiredPlan!)}`,
            ctaUrl: '/pricing',
          },
        },
        { status: 402 }
      );
    }
    
    return handler(req);
  };
}

/**
 * Higher-order function to wrap route handlers with feature gate
 * Usage in API routes:
 * 
 * export const GET = withFeatureGateHandler('stocks:ownership', async (req) => {
 *   // Your handler logic
 *   return NextResponse.json({ data: ... });
 * });
 */
export function withFeatureGateHandler(
  feature: FeatureGate,
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async function (req: NextRequest, context?: any): Promise<NextResponse> {
    const result = await checkFeatureGate(feature);
    
    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'Payment Required',
          message: result.message,
          feature,
          userPlan: result.userPlan,
          requiredPlan: result.requiredPlan,
          upgradeUrl: result.upgradeUrl,
          upgrade: {
            message: `Upgrade to ${getPlanDisplayName(result.requiredPlan!)} to access this feature`,
            currentPlan: getPlanDisplayName(result.userPlan),
            targetPlan: getPlanDisplayName(result.requiredPlan!),
            ctaText: `Upgrade to ${getPlanDisplayName(result.requiredPlan!)}`,
            ctaUrl: '/pricing',
          },
        },
        { status: 402 }
      );
    }
    
    return handler(req, context);
  };
}

/**
 * Check multiple features at once
 * Returns first failed gate or success
 */
export async function checkFeatureGates(
  features: FeatureGate[]
): Promise<FeatureGateResult> {
  for (const feature of features) {
    const result = await checkFeatureGate(feature);
    if (!result.allowed) {
      return result;
    }
  }
  
  const session = await getServerSession(authOptions);
  const userPlan = ((session?.user as any)?.plan || 'free') as PlanTier;
  
  return {
    allowed: true,
    userPlan,
  };
}

/**
 * Get user's current plan from session
 * Helper function for use in components and APIs
 */
export async function getUserPlan(): Promise<PlanTier> {
  const session = await getServerSession(authOptions);
  const plan = (session?.user as any)?.plan || 'free';
  return isValidPlan(plan) ? plan : 'free';
}

/**
 * Check if user can perform action based on limits
 * Usage: await checkActionLimit('watchlists', currentCount)
 */
export async function checkActionLimit(
  limitType: 'watchlists' | 'watchlistStocks' | 'savedScreeners' | 'alerts',
  currentCount: number
): Promise<{ allowed: boolean; limit: number; remaining: number; message?: string }> {
  const userPlan = await getUserPlan();
  const { getPlanLimits, hasReachedLimit, getRemainingQuota } = await import('@/lib/feature-gates');
  
  const limits = getPlanLimits(userPlan);
  const limit = limits[limitType];
  const reachedLimit = hasReachedLimit(userPlan, limitType, currentCount);
  const remaining = getRemainingQuota(userPlan, limitType, currentCount);
  
  if (reachedLimit) {
    const limitName = limitType.replace(/([A-Z])/g, ' $1').toLowerCase();
    return {
      allowed: false,
      limit: limit === -1 ? Infinity : limit,
      remaining: 0,
      message: `You've reached the maximum number of ${limitName} for your ${userPlan} plan. Upgrade to increase your limits.`,
    };
  }
  
  return {
    allowed: true,
    limit: limit === -1 ? Infinity : limit,
    remaining,
  };
}
