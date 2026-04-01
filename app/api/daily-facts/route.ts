/**
 * Daily Facts API
 * 
 * Manages time-series data (prices, volume, technical indicators, fundamentals)
 * Separated from static company data for historical queries and analytics
 * 
 * Sprint 3, Task SP3-01: Split Master & Daily Fact Datasets
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/daily-facts
 * Get time-series data with flexible filtering
 * 
 * Query params:
 *   - ticker: Stock ticker (required, e.g., ?ticker=BBCA)
 *   - startDate: ISO date string (e.g., ?startDate=2024-01-01)
 *   - endDate: ISO date string (e.g., ?endDate=2024-12-31)
 *   - limit: Max records to return (default: 365, max: 1000)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const ticker = searchParams.get('ticker')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limitParam = searchParams.get('limit')

    // Validation
    if (!ticker) {
      return NextResponse.json(
        { error: 'Missing required parameter: ticker' },
        { status: 400 }
      )
    }

    // Check if company exists
    const company = await prisma.companyMaster.findUnique({
      where: { ticker: ticker.toUpperCase() }
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    // Build date filter
    const where: any = { ticker: ticker.toUpperCase() }
    
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    // Parse limit
    const limit = Math.min(
      parseInt(limitParam || '365', 10),
      1000
    )

    const dailyFacts = await prisma.dailyFact.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit,
      select: {
        id: true,
        ticker: true,
        date: true,
        open: true,
        high: true,
        low: true,
        close: true,
        volume: true,
        marketCap: true,
        sma20: true,
        sma50: true,
        rsi14: true,
        pe: true,
        pb: true,
        roe: true,
        der: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      ticker: ticker.toUpperCase(),
      count: dailyFacts.length,
      data: dailyFacts.map(fact => ({
        ...fact,
        volume: fact.volume?.toString() // Convert BigInt to string for JSON
      }))
    })

  } catch (error) {
    console.error('GET /api/daily-facts error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/daily-facts
 * Add or update daily fact record
 * Uses upsert pattern to handle duplicate dates
 * 
 * Body:
 * {
 *   ticker: "BBCA",
 *   date: "2024-03-29",
 *   open: 10000,
 *   high: 10200,
 *   low: 9950,
 *   close: 10100,
 *   volume: 12345678,
 *   marketCap: 1500000000000
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      ticker,
      date,
      open,
      high,
      low,
      close,
      volume,
      marketCap,
      sma20,
      sma50,
      rsi14,
      pe,
      pb,
      roe,
      der
    } = body

    // Validation
    if (!ticker || !date || close === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: ticker, date, close' },
        { status: 400 }
      )
    }

    // Check if company exists
    const company = await prisma.companyMaster.findUnique({
      where: { ticker: ticker.toUpperCase() }
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found. Create company master record first.' },
        { status: 404 }
      )
    }

    // Upsert daily fact (update if exists, create if not)
    const dailyFact = await prisma.dailyFact.upsert({
      where: {
        ticker_date: {
          ticker: ticker.toUpperCase(),
          date: new Date(date)
        }
      },
      update: {
        open: open || null,
        high: high || null,
        low: low || null,
        close,
        volume: volume ? BigInt(volume) : null,
        marketCap: marketCap || null,
        sma20: sma20 || null,
        sma50: sma50 || null,
        rsi14: rsi14 || null,
        pe: pe || null,
        pb: pb || null,
        roe: roe || null,
        der: der || null
      },
      create: {
        ticker: ticker.toUpperCase(),
        date: new Date(date),
        open: open || null,
        high: high || null,
        low: low || null,
        close,
        volume: volume ? BigInt(volume) : null,
        marketCap: marketCap || null,
        sma20: sma20 || null,
        sma50: sma50 || null,
        rsi14: rsi14 || null,
        pe: pe || null,
        pb: pb || null,
        roe: roe || null,
        der: der || null
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        ...dailyFact,
        volume: dailyFact.volume?.toString()
      }
    }, { status: 201 })

  } catch (error) {
    console.error('POST /api/daily-facts error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/daily-facts
 * Delete daily fact records for a date range
 * 
 * Query params:
 *   - ticker: Stock ticker (required)
 *   - startDate: ISO date string (optional)
 *   - endDate: ISO date string (optional)
 * 
 * Use case: Remove bad data from backfill
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const ticker = searchParams.get('ticker')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!ticker) {
      return NextResponse.json(
        { error: 'Missing required parameter: ticker' },
        { status: 400 }
      )
    }

    // Build where clause
    const where: any = { ticker: ticker.toUpperCase() }
    
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    // Delete matching records
    const result = await prisma.dailyFact.deleteMany({ where })

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.count} daily fact records`,
      deletedCount: result.count
    })

  } catch (error) {
    console.error('DELETE /api/daily-facts error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
