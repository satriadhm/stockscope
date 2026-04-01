/**
 * POST /api/subscription/cancel
 * 
 * Handles subscription cancellation with feedback capture
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/prisma';
import type { CancellationSurvey, RetentionOffer } from '@/lib/cancellation';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await req.json();
    const { 
      survey, 
      retentionOfferShown, 
      retentionOfferAccepted 
    }: {
      survey: CancellationSurvey;
      retentionOfferShown?: RetentionOffer;
      retentionOfferAccepted: boolean;
    } = body;
    
    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Store cancellation feedback
    await prisma.cancellationFeedback.create({
      data: {
        userId: user.id,
        plan: user.plan || 'free',
        cancelledAt: new Date(),
        reason: survey.reason,
        specificFeedback: survey.specificFeedback || null,
        wouldConsiderReturning: survey.wouldConsiderReturning,
        satisfactionScore: survey.satisfactionScore || null,
        retentionOfferShown: retentionOfferShown || null,
        retentionOfferAccepted,
        finalAction: 'cancelled',
      },
    });
    
    // Update user plan to free
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        plan: 'free',
        cancelledAt: new Date(),
      },
    });
    
    // Track cancellation event
    await prisma.analyticsEvent.create({
      data: {
        eventName: 'subscription_cancelled',
        timestamp: new Date(),
        sessionId: user.id,
        userId: user.id,
        platform: 'web',
        deviceType: 'desktop',
        locale: 'id',
        properties: {
          previousPlan: user.plan,
          cancellationReason: survey.reason,
          retentionOfferShown: retentionOfferShown || null,
          retentionOfferAccepted,
        },
      },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
    });
  } catch (error) {
    console.error('Failed to cancel subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
