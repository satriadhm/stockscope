/**
 * Session Aggregation and Identity Stitching API
 * 
 * Aggregates raw events into sessions and links anonymous → authenticated users
 * Sprint 4, Task SP4-04: Sessions & Identity Stitching
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/sessions/aggregate
 * Aggregate events into sessions (run daily via cron)
 * 
 * Query params:
 *   - date: ISO date to process (default: yesterday)
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    
    // Process yesterday by default
    const targetDate = dateParam ? new Date(dateParam) : new Date(Date.now() - 24 * 60 * 60 * 1000)
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0))
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999))

    console.log(`[Session Aggregation] Processing events from ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`)

    // Get all unique session IDs from events in date range
    const sessions = await prisma.analyticsEvent.findMany({
      where: {
        timestamp: {
          gte: startOfDay,
          lte: endOfDay
        },
        // Exclude server-side events (they don't represent user sessions)
        sessionId: {
          not: {
            startsWith: 'server-'
          }
        }
      },
      select: {
        sessionId: true
      },
      distinct: ['sessionId']
    })

    console.log(`[Session Aggregation] Found ${sessions.length} unique sessions`)

    let processedCount = 0
    let stitchedCount = 0

    // Process each session
    for (const { sessionId } of sessions) {
      // Get all events for this session
      const events = await prisma.analyticsEvent.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'asc' }
      })

      if (events.length === 0) continue

      const firstEvent = events[0]
      const lastEvent = events[events.length - 1]

      // Determine if user logged in during session
      const userId = events.find(e => e.userId)?.userId || null
      const anonymousId = firstEvent.anonymousId || sessionId

      // Count event types
      const pageViews = events.filter(e => e.eventName === 'page_view').length
      const didSignup = events.some(e => e.eventName === 'auth_signup_completed')
      const didUpgrade = events.some(e => e.eventName === 'upgrade_button_clicked')
      const didPurchase = events.some(e => e.eventName === 'payment_completed')

      // Calculate duration (seconds)
      const duration = Math.floor(
        (lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime()) / 1000
      )

      // Upsert session record
      const session = await prisma.userSession.upsert({
        where: { sessionId },
        update: {
          userId,
          endTime: lastEvent.timestamp,
          duration,
          eventCount: events.length,
          pageViews,
          didSignup,
          didUpgrade,
          didPurchase,
          wasStitched: userId ? true : undefined, // Only update if userId exists
          stitchedAt: userId && !firstEvent.userId ? new Date() : undefined,
          updatedAt: new Date()
        },
        create: {
          sessionId,
          userId,
          anonymousId,
          startTime: firstEvent.timestamp,
          endTime: lastEvent.timestamp,
          duration,
          platform: firstEvent.platform || 'web',
          deviceType: firstEvent.deviceType || 'desktop',
          locale: firstEvent.locale || 'en',
          landingPage: firstEvent.pageUrl || null,
          referrer: firstEvent.referrer || null,
          utmSource: firstEvent.utmSource || null,
          utmMedium: firstEvent.utmMedium || null,
          utmCampaign: firstEvent.utmCampaign || null,
          utmContent: firstEvent.utmContent || null,
          utmTerm: firstEvent.utmTerm || null,
          eventCount: events.length,
          pageViews,
          didSignup,
          didUpgrade,
          didPurchase,
          wasStitched: userId && !firstEvent.userId ? true : false,
          stitchedAt: userId && !firstEvent.userId ? new Date() : null
        }
      })

      processedCount++
      if (session.wasStitched) stitchedCount++
    }

    console.log(`[Session Aggregation] Processed ${processedCount} sessions, stitched ${stitchedCount} identities`)

    return NextResponse.json({
      success: true,
      date: targetDate.toISOString().split('T')[0],
      sessionsProcessed: processedCount,
      identitiesStitched: stitchedCount
    })

  } catch (error) {
    console.error('POST /api/sessions/aggregate error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sessions/stitch
 * Retroactively stitch anonymous events to authenticated user
 * 
 * Body: { userId: string, anonymousId: string }
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId, anonymousId } = await request.json()

    if (!userId || !anonymousId) {
      return NextResponse.json(
        { error: 'Missing userId or anonymousId' },
        { status: 400 }
      )
    }

    console.log(`[Identity Stitching] Linking anonymousId ${anonymousId} to userId ${userId}`)

    // Update all events with this anonymousId to include userId
    const result = await prisma.analyticsEvent.updateMany({
      where: {
        anonymousId,
        userId: null // Only update events that don't have userId yet
      },
      data: {
        userId,
        processedAt: new Date()
      }
    })

    // Update sessions with this anonymousId
    const sessionResult = await prisma.userSession.updateMany({
      where: {
        anonymousId,
        userId: null
      },
      data: {
        userId,
        wasStitched: true,
        stitchedAt: new Date()
      }
    })

    console.log(`[Identity Stitching] Updated ${result.count} events and ${sessionResult.count} sessions`)

    return NextResponse.json({
      success: true,
      eventsUpdated: result.count,
      sessionsUpdated: sessionResult.count
    })

  } catch (error) {
    console.error('PUT /api/sessions/stitch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/sessions
 * Query user sessions
 * 
 * Query params:
 *   - userId: Filter by user
 *   - anonymousId: Filter by anonymous ID
 *   - startDate: Date range start
 *   - endDate: Date range end
 *   - limit: Max records (default: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const userId = searchParams.get('userId')
    const anonymousId = searchParams.get('anonymousId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limitParam = searchParams.get('limit')

    // Build filter
    const where: any = {}

    if (userId) where.userId = userId
    if (anonymousId) where.anonymousId = anonymousId

    if (startDate || endDate) {
      where.startTime = {}
      if (startDate) where.startTime.gte = new Date(startDate)
      if (endDate) where.startTime.lte = new Date(endDate)
    }

    const limit = Math.min(
      parseInt(limitParam || '100', 10),
      1000
    )

    const sessions = await prisma.userSession.findMany({
      where,
      orderBy: { startTime: 'desc' },
      take: limit
    })

    return NextResponse.json({
      success: true,
      count: sessions.length,
      sessions
    })

  } catch (error) {
    console.error('GET /api/sessions error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
