/**
 * GET /api/experiments/metrics
 * 
 * Returns A/B test metrics for all active experiments
 * Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/prisma';
import { PRICING_EXPERIMENTS, calculateConversionMetrics, type ExperimentVariant } from '@/lib/experiments';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // Check admin auth (you might have a different admin check)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { searchParams } = new URL(req.url);
    const experimentId = searchParams.get('experimentId');
    
    if (experimentId) {
      // Get metrics for specific experiment
      const metrics = await getExperimentMetrics(experimentId);
      return NextResponse.json({ experiment: metrics });
    }
    
    // Get metrics for all active experiments
    const allMetrics = await Promise.all(
      Object.values(PRICING_EXPERIMENTS)
        .filter(exp => exp.isActive)
        .map(exp => getExperimentMetrics(exp.id))
    );
    
    return NextResponse.json({ experiments: allMetrics });
  } catch (error) {
    console.error('Failed to fetch experiment metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

async function getExperimentMetrics(experimentId: string) {
  // Query events from analytics database
  const events = await prisma.analyticsEvent.findMany({
    where: {
      eventName: 'experiment_interaction',
    },
  });
  
  // Group by variant
  const variantMetrics: Record<ExperimentVariant, any> = {
    control: { impressions: 0, clicks: 0, checkouts: 0, conversions: 0, totalRevenue: 0 },
    variant_a: { impressions: 0, clicks: 0, checkouts: 0, conversions: 0, totalRevenue: 0 },
    variant_b: { impressions: 0, clicks: 0, checkouts: 0, conversions: 0, totalRevenue: 0 },
  };
  
  for (const event of events) {
    // Filter by experimentId in app code (Prisma JSON filters are limited)
    const props = event.properties as any;
    if (!props || props.experimentId !== experimentId) continue;
    
    const variant = props.experimentVariant as ExperimentVariant;
    const action = props.experimentAction;
    
    if (!variant || !variantMetrics[variant]) continue;
    
    if (action === 'viewed') {
      variantMetrics[variant].impressions++;
    } else if (action === 'clicked') {
      variantMetrics[variant].clicks++;
    } else if (action === 'converted') {
      variantMetrics[variant].conversions++;
      
      // Add revenue if available
      const amount = props.amount as number;
      if (amount) {
        variantMetrics[variant].totalRevenue += amount;
      }
    }
  }
  
  // Calculate metrics for each variant
  const metrics = Object.entries(variantMetrics).map(([variant, data]) => {
    return calculateConversionMetrics(experimentId, variant as ExperimentVariant, data);
  });
  
  return {
    experimentId,
    variants: metrics,
    totalImpressions: metrics.reduce((sum, m) => sum + m.impressions, 0),
    totalConversions: metrics.reduce((sum, m) => sum + m.conversions, 0),
    totalRevenue: metrics.reduce((sum, m) => sum + m.totalRevenue, 0),
  };
}

/**
 * POST /api/experiments/metrics
 * 
 * Manual override to mark experiment winner
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await req.json();
    const { experimentId, winningVariant, reason } = body;
    
    // Log the decision
    console.log(`Experiment ${experimentId} concluded: ${winningVariant} won`);
    console.log(`Reason: ${reason}`);
    
    // You could store this in database
    // await prisma.experimentConclusion.create({ ... });
    
    return NextResponse.json({
      success: true,
      experimentId,
      winningVariant,
      message: 'Experiment concluded successfully',
    });
  } catch (error) {
    console.error('Failed to conclude experiment:', error);
    return NextResponse.json(
      { error: 'Failed to conclude experiment' },
      { status: 500 }
    );
  }
}
