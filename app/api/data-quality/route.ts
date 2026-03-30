/**
 * Data Quality Snapshots API
 * 
 * Track data freshness, completeness, and accuracy metrics
 * Enables monitoring and alerting for data pipeline health
 * 
 * Sprint 3, Task SP3-04: Data Lineage & Quality Snapshots
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/data-quality
 * Get quality metrics with filtering
 * 
 * Query params:
 *   - dataSource: Filter by source (e.g., ?dataSource=IDX)
 *   - date: Specific date (e.g., ?date=2024-03-29)
 *   - isStale: Filter stale sources (e.g., ?isStale=true)
 *   - startDate: Date range start
 *   - endDate: Date range end
 *   - limit: Max records (default: 100, max: 1000)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dataSource = searchParams.get('dataSource')
    const dateParam = searchParams.get('date')
    const isStaleParam = searchParams.get('isStale')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limitParam = searchParams.get('limit')

    // Build filter
    const where: any = {}

    if (dataSource) {
      where.dataSource = dataSource
    }

    if (dateParam) {
      where.date = new Date(dateParam)
    } else if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    if (isStaleParam !== null) {
      where.isStale = isStaleParam === 'true'
    }

    const limit = Math.min(
      parseInt(limitParam || '100', 10),
      1000
    )

    const snapshots = await prisma.dataQualitySnapshot.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit
    })

    return NextResponse.json({
      success: true,
      count: snapshots.length,
      data: snapshots
    })

  } catch (error) {
    console.error('GET /api/data-quality error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/data-quality
 * Record data quality metrics
 * 
 * Body:
 * {
 *   date: "2024-03-29",
 *   dataSource: "IDX",
 *   lastUpdateTime: "2024-03-29T15:30:00Z",
 *   updateDelayMinutes: 15,
 *   expectedRecords: 1000,
 *   actualRecords: 995,
 *   validationsPassed: 990,
 *   validationsFailed: 5,
 *   errorCount: 3,
 *   errorSample: "Missing sector field for ABCD"
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
      date,
      dataSource,
      lastUpdateTime,
      updateDelayMinutes,
      expectedRecords,
      actualRecords,
      missingFields,
      validationsPassed,
      validationsFailed,
      errorCount,
      errorSample
    } = body

    // Validation
    if (!date || !dataSource || !lastUpdateTime || expectedRecords === undefined || actualRecords === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: date, dataSource, lastUpdateTime, expectedRecords, actualRecords' },
        { status: 400 }
      )
    }

    // Calculate derived metrics
    const completenessRate = expectedRecords > 0 
      ? (actualRecords / expectedRecords) * 100 
      : 0

    const totalValidations = validationsPassed + validationsFailed
    const accuracyRate = totalValidations > 0
      ? (validationsPassed / totalValidations) * 100
      : 100

    // Determine staleness (consider stale if delay > 60 minutes)
    const isStale = updateDelayMinutes > 60

    // Upsert quality snapshot
    const snapshot = await prisma.dataQualitySnapshot.upsert({
      where: {
        date_dataSource: {
          date: new Date(date),
          dataSource
        }
      },
      update: {
        lastUpdateTime: new Date(lastUpdateTime),
        updateDelayMinutes,
        isStale,
        expectedRecords,
        actualRecords,
        completenessRate,
        missingFields: missingFields || null,
        validationsPassed,
        validationsFailed,
        accuracyRate,
        errorCount: errorCount || 0,
        errorSample: errorSample || null
      },
      create: {
        date: new Date(date),
        dataSource,
        lastUpdateTime: new Date(lastUpdateTime),
        updateDelayMinutes,
        isStale,
        expectedRecords,
        actualRecords,
        completenessRate,
        missingFields: missingFields || null,
        validationsPassed,
        validationsFailed,
        accuracyRate,
        errorCount: errorCount || 0,
        errorSample: errorSample || null
      }
    })

    return NextResponse.json({
      success: true,
      data: snapshot
    }, { status: 201 })

  } catch (error) {
    console.error('POST /api/data-quality error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
