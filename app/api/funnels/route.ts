/**
 * Conversion Funnel Aggregation API
 * 
 * Calculates daily funnel metrics for product analytics
 * Sprint 4, Task SP4-05: Daily Funnel Aggregation
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, requireCron } from '@/lib/auth/guards'

// Funnel definitions
const FUNNELS = {
  signup_funnel: {
    name: 'signup_funnel',
    steps: [
      { name: 'landing', event: 'session_start' },
      { name: 'signup_clicked', event: 'auth_signin_clicked' },
      { name: 'signup_completed', event: 'auth_signup_completed' }
    ]
  },
  purchase_funnel: {
    name: 'purchase_funnel',
    steps: [
      { name: 'landing', event: 'session_start' },
      { name: 'upgrade_viewed', event: 'upgrade_modal_viewed' },
      { name: 'upgrade_clicked', event: 'upgrade_button_clicked' },
      { name: 'checkout_initiated', event: 'payment_checkout_initiated' },
      { name: 'payment_completed', event: 'payment_completed' }
    ]
  },
  watchlist_funnel: {
    name: 'watchlist_funnel',
    steps: [
      { name: 'search_entered', event: 'search_query_entered' },
      { name: 'result_clicked', event: 'search_result_clicked' },
      { name: 'stock_added', event: 'watchlist_stock_added' }
    ]
  },
  screener_funnel: {
    name: 'screener_funnel',
    steps: [
      { name: 'screener_viewed', event: 'screener_viewed' },
      { name: 'filter_applied', event: 'screener_filter_applied' },
      { name: 'stock_clicked', event: 'screener_stock_clicked' },
      { name: 'watchlist_added', event: 'watchlist_stock_added' }
    ]
  },
  engagement_funnel: {
    name: 'engagement_funnel',
    steps: [
      { name: 'landing', event: 'session_start' },
      { name: 'page_view', event: 'page_view' },
      { name: 'screener_used', event: 'screener_filter_applied' },
      { name: 'watchlist_created', event: 'watchlist_created' }
    ]
  }
}

/**
 * POST /api/funnels/aggregate
 * Calculate funnel metrics for a specific date (run daily via cron)
 * 
 * Query params:
 *   - date: ISO date to process (default: yesterday)
 *   - funnel: Specific funnel to calculate (default: all)
 */
export async function POST(request: NextRequest) {
  const cronError = requireCron(request)
  if (cronError) return cronError
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const funnelParam = searchParams.get('funnel')
    
    // Process yesterday by default
    const targetDate = dateParam ? new Date(dateParam) : new Date(Date.now() - 24 * 60 * 60 * 1000)
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0))
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999))

    console.log(`[Funnel Aggregation] Processing funnels for ${startOfDay.toISOString().split('T')[0]}`)

    // Determine which funnels to process
    const funnelsToProcess = funnelParam && FUNNELS[funnelParam as keyof typeof FUNNELS]
      ? [FUNNELS[funnelParam as keyof typeof FUNNELS]]
      : Object.values(FUNNELS)

    const results = []

    for (const funnel of funnelsToProcess) {
      console.log(`[Funnel Aggregation] Processing ${funnel.name}`)

      // Calculate overall funnel (no segmentation)
      const overallResult = await calculateFunnel(funnel, startOfDay, endOfDay)
      results.push(overallResult)

      // Calculate by platform
      for (const platform of ['web', 'mobile_ios', 'mobile_android']) {
        const platformResult = await calculateFunnel(funnel, startOfDay, endOfDay, { platform })
        if (platformResult.step1Count > 0) {
          results.push(platformResult)
        }
      }

      // Calculate by top UTM sources (limit to top 5 to avoid explosion)
      const topSources = await getTopUTMSources(startOfDay, endOfDay, 5)
      for (const source of topSources) {
        const sourceResult = await calculateFunnel(funnel, startOfDay, endOfDay, {
          utmSource: source.utmSource || undefined,
          utmMedium: source.utmMedium || undefined,
          utmCampaign: source.utmCampaign || undefined
        })
        if (sourceResult.step1Count > 0) {
          results.push(sourceResult)
        }
      }
    }

    console.log(`[Funnel Aggregation] Completed. Generated ${results.length} funnel records`)

    return NextResponse.json({
      success: true,
      date: startOfDay.toISOString().split('T')[0],
      funnelsProcessed: results.length
    })

  } catch (error) {
    console.error('POST /api/funnels/aggregate error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Calculate funnel metrics for specific date and segmentation
 */
async function calculateFunnel(
  funnel: typeof FUNNELS[keyof typeof FUNNELS],
  startDate: Date,
  endDate: Date,
  segment?: {
    platform?: string
    utmSource?: string
    utmMedium?: string
    utmCampaign?: string
  }
) {
  const steps = funnel.steps
  const stepCounts: number[] = []
  const stepRates: number[] = []

  // Build base filter
  const baseFilter: any = {
    timestamp: { gte: startDate, lte: endDate }
  }
  if (segment?.platform) baseFilter.platform = segment.platform
  if (segment?.utmSource) baseFilter.utmSource = segment.utmSource
  if (segment?.utmMedium) baseFilter.utmMedium = segment.utmMedium
  if (segment?.utmCampaign) baseFilter.utmCampaign = segment.utmCampaign

  // Count unique users at each step
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    
    // Get unique users who completed this step
    const users = await prisma.analyticsEvent.findMany({
      where: {
        ...baseFilter,
        eventName: step.event as any
      },
      select: {
        userId: true,
        anonymousId: true
      },
      distinct: ['userId', 'anonymousId']
    })

    // Count unique users (use userId if available, else anonymousId)
    const uniqueUsers = new Set(
      users.map(u => u.userId || u.anonymousId)
    ).size

    stepCounts.push(uniqueUsers)

    // Calculate conversion rate from previous step
    if (i > 0 && stepCounts[i - 1] > 0) {
      stepRates.push(uniqueUsers / stepCounts[i - 1])
    } else {
      stepRates.push(1.0) // First step is 100%
    }
  }

  // Find step with highest drop-off
  let maxDropoff = 0
  let dropoffStep = ''
  for (let i = 1; i < stepRates.length; i++) {
    const dropoff = 1 - stepRates[i]
    if (dropoff > maxDropoff) {
      maxDropoff = dropoff
      dropoffStep = steps[i].name
    }
  }

  // Calculate overall conversion rate (first step to last step)
  const overallRate = stepCounts[0] > 0
    ? stepCounts[stepCounts.length - 1] / stepCounts[0]
    : 0

  // Upsert funnel record
  const funnelData: any = {
    funnelName: funnel.name,
    date: startDate,
    step1Name: steps[0].name,
    step1Count: stepCounts[0] || 0,
    step2Name: steps[1].name,
    step2Count: stepCounts[1] || 0,
    step2Rate: stepRates[1] || 0,
    overallRate,
    dropoffStep: dropoffStep || null,
    dropoffRate: maxDropoff,
    platform: segment?.platform || null,
    utmSource: segment?.utmSource || null,
    utmMedium: segment?.utmMedium || null,
    utmCampaign: segment?.utmCampaign || null
  }

  // Add optional steps 3-5
  if (steps[2]) {
    funnelData.step3Name = steps[2].name
    funnelData.step3Count = stepCounts[2] || 0
    funnelData.step3Rate = stepRates[2] || 0
  }
  if (steps[3]) {
    funnelData.step4Name = steps[3].name
    funnelData.step4Count = stepCounts[3] || 0
    funnelData.step4Rate = stepRates[3] || 0
  }
  if (steps[4]) {
    funnelData.step5Name = steps[4].name
    funnelData.step5Count = stepCounts[4] || 0
    funnelData.step5Rate = stepRates[4] || 0
  }

  // Find existing funnel record
  const existing = await prisma.conversionFunnel.findFirst({
    where: {
      funnelName: funnel.name,
      date: startDate,
      platform: segment?.platform ?? null,
      utmSource: segment?.utmSource ?? null,
      utmMedium: segment?.utmMedium ?? null,
      utmCampaign: segment?.utmCampaign ?? null
    }
  })

  if (existing) {
    // Update existing record
    await prisma.conversionFunnel.update({
      where: { id: existing.id },
      data: funnelData
    })
  } else {
    // Create new record
    await prisma.conversionFunnel.create({
      data: funnelData
    })
  }

  return funnelData
}

/**
 * Get top UTM sources for segmented analysis
 */
async function getTopUTMSources(startDate: Date, endDate: Date, limit: number) {
  const sources = await prisma.analyticsEvent.groupBy({
    by: ['utmSource', 'utmMedium', 'utmCampaign'],
    where: {
      timestamp: { gte: startDate, lte: endDate },
      utmSource: { not: null }
    },
    _count: true,
    orderBy: {
      _count: {
        utmSource: 'desc'
      }
    },
    take: limit
  })

  return sources.map(s => ({
    utmSource: s.utmSource,
    utmMedium: s.utmMedium,
    utmCampaign: s.utmCampaign
  }))
}

/**
 * GET /api/funnels
 * Query funnel metrics
 * 
 * Query params:
 *   - funnelName: Filter by funnel
 *   - startDate: Date range start
 *   - endDate: Date range end
 *   - platform: Filter by platform
 *   - utmSource: Filter by UTM source
 */
export async function GET(request: NextRequest) {
  const { error: adminError } = await requireAdmin()
  if (adminError) return adminError
  try {
    const { searchParams } = new URL(request.url)

    const funnelName = searchParams.get('funnelName')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const platform = searchParams.get('platform')
    const utmSource = searchParams.get('utmSource')

    // Build filter
    const where: any = {}

    if (funnelName) where.funnelName = funnelName
    if (platform) where.platform = platform
    if (utmSource) where.utmSource = utmSource

    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    const funnels = await prisma.conversionFunnel.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 100
    })

    return NextResponse.json({
      success: true,
      count: funnels.length,
      funnels
    })

  } catch (error) {
    console.error('GET /api/funnels error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
