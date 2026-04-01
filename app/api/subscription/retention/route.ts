/**
 * POST /api/subscription/retention
 * 
 * Handles retention offer acceptance (discount, pause, downgrade)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/prisma';
import type { CancellationSurvey, RetentionOffer } from '@/lib/cancellation';
import { RETENTION_OFFERS } from '@/lib/cancellation';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await req.json();
    const { 
      survey, 
      retentionOffer, 
      accepted 
    }: {
      survey: CancellationSurvey;
      retentionOffer: RetentionOffer;
      accepted: boolean;
    } = body;
    
    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const offer = RETENTION_OFFERS[retentionOffer];
    
    // Store retention feedback
    await prisma.cancellationFeedback.create({
      data: {
        userId: user.id,
        plan: user.plan || 'free',
        cancelledAt: new Date(),
        reason: survey.reason,
        specificFeedback: survey.specificFeedback || null,
        wouldConsiderReturning: survey.wouldConsiderReturning,
        satisfactionScore: survey.satisfactionScore || null,
        retentionOfferShown: retentionOffer,
        retentionOfferAccepted: accepted,
        finalAction: accepted ? 'retained' : 'cancelled',
      },
    });
    
    if (accepted) {
      // Apply retention offer
      const updates: any = {};
      
      if (offer.discount) {
        // Apply discount for 3 months
        updates.discountPercent = offer.discount;
        updates.discountExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 3 months
      }
      
      if (offer.pauseDuration) {
        // Pause subscription
        updates.pausedUntil = new Date(Date.now() + offer.pauseDuration * 30 * 24 * 60 * 60 * 1000);
      }
      
      if (retentionOffer === 'downgrade_free') {
        // Downgrade to free
        updates.plan = 'free';
      }
      
      // Update user
      await prisma.user.update({
        where: { id: user.id },
        data: updates,
      });
      
      // Track retention event
      await prisma.analyticsEvent.create({
        data: {
          eventName: 'subscription_retained',
          timestamp: new Date(),
          sessionId: user.id,
          userId: user.id,
          platform: 'web',
          deviceType: 'desktop',
          locale: 'id',
          properties: {
            retentionOffer,
            cancellationReason: survey.reason,
          },
        },
      });
      
      return NextResponse.json({
        success: true,
        message: 'Retention offer applied successfully',
        offer: {
          type: retentionOffer,
          discount: offer.discount,
          pauseDuration: offer.pauseDuration,
        },
      });
    }
    
    return NextResponse.json({
      success: false,
      message: 'Retention offer declined',
    });
  } catch (error) {
    console.error('Failed to apply retention offer:', error);
    return NextResponse.json(
      { error: 'Failed to apply retention offer' },
      { status: 500 }
    );
  }
}
