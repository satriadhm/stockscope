// Subscription Management API
// Handles subscription lifecycle: create, cancel, query
// SP5-02: Payment Transactions with Idempotency

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/prisma';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'past_due' | 'trialing';
type PlanId = 'free' | 'premium' | 'pro';
type BillingCycle = 'monthly' | 'annual';

interface CreateSubscriptionBody {
  planId: PlanId;
  billingCycle?: BillingCycle;
  trialDays?: number; // Default 7 days trial
}

interface CancelSubscriptionBody {
  subscriptionId: string;
  cancelReason?: string;
}

// =============================================================================
// POST /api/subscriptions - Create Subscription
// =============================================================================

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body: CreateSubscriptionBody = await req.json();

    // Validate plan
    if (!body.planId || !['free', 'premium', 'pro'].includes(body.planId)) {
      return NextResponse.json(
        { error: 'Invalid planId. Must be "free", "premium", or "pro".' },
        { status: 400 }
      );
    }

    // Check for existing active subscription for this plan
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        planId: body.planId,
        status: 'active'
      }
    });

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'Active subscription already exists for this plan.' },
        { status: 409 }
      );
    }

    // Calculate trial period
    const trialDays = body.trialDays !== undefined ? body.trialDays : 7;
    const now = new Date();
    const trialEnd = trialDays > 0 ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000) : null;

    // For free plan, no trial needed
    const status: SubscriptionStatus = body.planId === 'free' ? 'active' : (trialDays > 0 ? 'trialing' : 'active');

    // Calculate billing period (for paid plans)
    let currentPeriodStart: Date | null = null;
    let currentPeriodEnd: Date | null = null;

    if (body.planId !== 'free') {
      currentPeriodStart = trialEnd || now;
      const cycleMonths = body.billingCycle === 'annual' ? 12 : 1;
      currentPeriodEnd = new Date(currentPeriodStart);
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + cycleMonths);
    }

    // Create subscription
    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: body.planId,
        status,
        startDate: now,
        trialEnd,
        billingCycle: body.billingCycle || 'monthly',
        currentPeriodStart,
        currentPeriodEnd,
      }
    });

    // Update user's plan
    await prisma.user.update({
      where: { id: user.id },
      data: { plan: body.planId }
    });

    console.log(`[SUBSCRIPTION] Created: ${subscription.id} | User: ${user.id} | Plan: ${body.planId} | Status: ${status}`);

    return NextResponse.json({
      subscription,
      message: 'Subscription created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('[SUBSCRIPTION CREATE ERROR]', error);

    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Subscription already exists.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET /api/subscriptions - Query User's Subscriptions
// =============================================================================

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as SubscriptionStatus | null;
    const planId = searchParams.get('planId') as PlanId | null;

    // Build query filter
    const where: any = {
      userId: user.id
    };

    if (status) {
      where.status = status;
    }

    if (planId) {
      where.planId = planId;
    }

    // Execute query
    const subscriptions = await prisma.subscription.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    // Get active subscription
    const activeSubscription = subscriptions.find(sub => sub.status === 'active');

    return NextResponse.json({
      subscriptions,
      active: activeSubscription || null,
      count: subscriptions.length
    }, { status: 200 });

  } catch (error: any) {
    console.error('[SUBSCRIPTION QUERY ERROR]', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE /api/subscriptions - Cancel Subscription
// =============================================================================

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body: CancelSubscriptionBody = await req.json();

    if (!body.subscriptionId) {
      return NextResponse.json(
        { error: 'subscriptionId is required.' },
        { status: 400 }
      );
    }

    // Find subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id: body.subscriptionId }
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found.' },
        { status: 404 }
      );
    }

    // Authorization check: user can only cancel their own subscriptions
    if (subscription.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden. Cannot cancel another user\'s subscription.' },
        { status: 403 }
      );
    }

    // Check if already cancelled
    if (subscription.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Subscription is already cancelled.' },
        { status: 400 }
      );
    }

    // Cancel subscription
    const now = new Date();
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'cancelled',
        cancelledAt: now,
        cancelReason: body.cancelReason || null,
        endDate: now // End immediately (or could use currentPeriodEnd for grace period)
      }
    });

    // Downgrade user to free plan
    await prisma.user.update({
      where: { id: user.id },
      data: { plan: 'free' }
    });

    console.log(`[SUBSCRIPTION] Cancelled: ${subscription.id} | User: ${user.id} | Reason: ${body.cancelReason || 'None'}`);

    // Track cancellation event (analytics)
    try {
      await prisma.analyticsEvent.create({
        data: {
          eventName: 'subscription_cancelled',
          userId: user.id,
          sessionId: 'server-subscription-cancel',
          timestamp: now,
          platform: 'web',
          deviceType: 'desktop',
          locale: 'en',
          properties: {
            subscriptionId: subscription.id,
            planId: subscription.planId,
            cancelReason: body.cancelReason || 'Not provided'
          }
        }
      });
    } catch (analyticsError) {
      console.warn('[ANALYTICS] Failed to track cancellation event:', analyticsError);
    }

    return NextResponse.json({
      subscription: updatedSubscription,
      message: 'Subscription cancelled successfully'
    }, { status: 200 });

  } catch (error: any) {
    console.error('[SUBSCRIPTION CANCEL ERROR]', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
