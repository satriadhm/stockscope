/**
 * Ownership Snapshots API
 * 
 * Daily ownership data from IDX reports
 * Tracks shareholding changes over time for governance and institutional analysis
 * 
 * Sprint 3, Task SP3-02: Ownership Snapshot Pipeline
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withFeatureGateHandler } from '@/lib/feature-gate-middleware'

/**
 * GET /api/ownership-snapshots
 * Get ownership data with flexible filtering
 * 
 * Query params:
 *   - ticker: Stock ticker (e.g., ?ticker=BBCA)
 *   - date: Specific date (e.g., ?date=2024-03-29)
 *   - holderName: Search holder name (e.g., ?holderName=BlackRock)
 *   - holderType: Filter by type (e.g., ?holderType=Institution)
 *   - minPercentage: Min ownership % (e.g., ?minPercentage=5)
 *   - limit: Max records (default: 100, max: 1000)
 * 
 * FEATURE GATE: Requires Premium plan for ownership data
 */
export const GET = withFeatureGateHandler('stocks:ownership', async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const ticker = searchParams.get('ticker')
    const dateParam = searchParams.get('date')
    const holderName = searchParams.get('holderName')
    const holderType = searchParams.get('holderType')
    const minPercentage = searchParams.get('minPercentage')
    const limitParam = searchParams.get('limit')

    // Build filter
    const where: any = {}

    if (ticker) {
      where.ticker = ticker.toUpperCase()
    }

    if (dateParam) {
      where.date = new Date(dateParam)
    }

    if (holderName) {
      where.holderName = { contains: holderName, mode: 'insensitive' }
    }

    if (holderType) {
      where.holderType = holderType
    }

    if (minPercentage) {
      where.percentage = { gte: parseFloat(minPercentage) }
    }

    // Parse limit
    const limit = Math.min(
      parseInt(limitParam || '100', 10),
      1000
    )

    const snapshots = await prisma.ownershipSnapshot.findMany({
      where,
      orderBy: [
        { date: 'desc' },
        { percentage: 'desc' }
      ],
      take: limit,
      select: {
        id: true,
        ticker: true,
        date: true,
        holderName: true,
        shares: true,
        percentage: true,
        holderType: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      count: snapshots.length,
      data: snapshots.map(snapshot => ({
        ...snapshot,
        shares: snapshot.shares.toString() // Convert BigInt to string
      }))
    })

  } catch (error) {
    console.error('GET /api/ownership-snapshots error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
});

/**
 * POST /api/ownership-snapshots
 * Add ownership snapshot data
 * Uses upsert pattern to handle duplicate ticker+date+holder combinations
 * 
 * Body:
 * {
 *   ticker: "BBCA",
 *   date: "2024-03-29",
 *   holderName: "PT Dwimuria Investama Andalan",
 *   shares: 3500000000,
 *   percentage: 10.5,
 *   holderType: "Institution"
 * }
 * 
 * Or batch upload:
 * {
 *   snapshots: [
 *     { ticker: "BBCA", date: "2024-03-29", holderName: "...", shares: ..., percentage: ... },
 *     { ticker: "BBCA", date: "2024-03-29", holderName: "...", shares: ..., percentage: ... }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Handle batch upload
    if (body.snapshots && Array.isArray(body.snapshots)) {
      const results = []

      for (const snapshot of body.snapshots) {
        const { ticker, date, holderName, shares, percentage, holderType } = snapshot

        // Validation
        if (!ticker || !date || !holderName || shares === undefined || percentage === undefined) {
          return NextResponse.json(
            { error: 'Missing required fields in snapshot: ticker, date, holderName, shares, percentage' },
            { status: 400 }
          )
        }

        // Upsert snapshot
        const result = await prisma.ownershipSnapshot.upsert({
          where: {
            ticker_date_holderName: {
              ticker: ticker.toUpperCase(),
              date: new Date(date),
              holderName
            }
          },
          update: {
            shares: BigInt(shares),
            percentage,
            holderType: holderType || null
          },
          create: {
            ticker: ticker.toUpperCase(),
            date: new Date(date),
            holderName,
            shares: BigInt(shares),
            percentage,
            holderType: holderType || null
          }
        })

        results.push(result)
      }

      return NextResponse.json({
        success: true,
        message: `Processed ${results.length} ownership snapshots`,
        count: results.length
      }, { status: 201 })
    }

    // Handle single snapshot
    const { ticker, date, holderName, shares, percentage, holderType } = body

    // Validation
    if (!ticker || !date || !holderName || shares === undefined || percentage === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: ticker, date, holderName, shares, percentage' },
        { status: 400 }
      )
    }

    // Upsert snapshot
    const snapshot = await prisma.ownershipSnapshot.upsert({
      where: {
        ticker_date_holderName: {
          ticker: ticker.toUpperCase(),
          date: new Date(date),
          holderName
        }
      },
      update: {
        shares: BigInt(shares),
        percentage,
        holderType: holderType || null
      },
      create: {
        ticker: ticker.toUpperCase(),
        date: new Date(date),
        holderName,
        shares: BigInt(shares),
        percentage,
        holderType: holderType || null
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        ...snapshot,
        shares: snapshot.shares.toString()
      }
    }, { status: 201 })

  } catch (error) {
    console.error('POST /api/ownership-snapshots error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/ownership-snapshots
 * Delete ownership snapshots for a specific ticker and date
 * 
 * Query params:
 *   - ticker: Stock ticker (required)
 *   - date: Specific date (required)
 * 
 * Use case: Remove bad data from scraping errors
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const ticker = searchParams.get('ticker')
    const dateParam = searchParams.get('date')

    if (!ticker || !dateParam) {
      return NextResponse.json(
        { error: 'Missing required parameters: ticker, date' },
        { status: 400 }
      )
    }

    // Delete matching snapshots
    const result = await prisma.ownershipSnapshot.deleteMany({
      where: {
        ticker: ticker.toUpperCase(),
        date: new Date(dateParam)
      }
    })

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.count} ownership snapshots`,
      deletedCount: result.count
    })

  } catch (error) {
    console.error('DELETE /api/ownership-snapshots error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
