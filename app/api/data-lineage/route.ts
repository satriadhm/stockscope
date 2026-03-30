/**
 * Data Lineage API
 * 
 * Track data transformations and dependencies
 * Enables tracing data flow from source to destination
 * 
 * Sprint 3, Task SP3-04: Data Lineage & Quality Snapshots
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/data-lineage
 * Query lineage records with filtering
 * 
 * Query params:
 *   - sourceName: Filter by source (e.g., ?sourceName=IDX-API)
 *   - destinationName: Filter by destination (e.g., ?destinationName=company_master)
 *   - transformationName: Filter by job (e.g., ?transformationName=daily-stock-import)
 *   - jobId: Get all steps for a job (e.g., ?jobId=job-12345)
 *   - status: Filter by status (e.g., ?status=Failed)
 *   - startDate: Time range start
 *   - endDate: Time range end
 *   - limit: Max records (default: 100, max: 1000)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sourceName = searchParams.get('sourceName')
    const destinationName = searchParams.get('destinationName')
    const transformationName = searchParams.get('transformationName')
    const jobId = searchParams.get('jobId')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limitParam = searchParams.get('limit')

    // Build filter
    const where: any = {}

    if (sourceName) {
      where.sourceName = sourceName
    }

    if (destinationName) {
      where.destinationName = destinationName
    }

    if (transformationName) {
      where.transformationName = transformationName
    }

    if (jobId) {
      where.jobId = jobId
    }

    if (status) {
      where.status = status
    }

    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = new Date(startDate)
      if (endDate) where.timestamp.lte = new Date(endDate)
    }

    const limit = Math.min(
      parseInt(limitParam || '100', 10),
      1000
    )

    const lineages = await prisma.dataLineage.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit
    })

    return NextResponse.json({
      success: true,
      count: lineages.length,
      data: lineages
    })

  } catch (error) {
    console.error('GET /api/data-lineage error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/data-lineage
 * Record a data transformation
 * 
 * Body:
 * {
 *   sourceType: "API",
 *   sourceName: "IDX-API",
 *   sourceVersion: "v2.1",
 *   transformationType: "Extract",
 *   transformationName: "daily-stock-import",
 *   recordsProcessed: 1000,
 *   recordsSucceeded: 995,
 *   recordsFailed: 5,
 *   destinationType: "Database",
 *   destinationName: "daily_facts",
 *   durationMs: 3500,
 *   jobId: "job-12345",
 *   triggeredBy: "Cron",
 *   status: "Success"
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
      sourceType,
      sourceName,
      sourceVersion,
      transformationType,
      transformationName,
      recordsProcessed,
      recordsSucceeded,
      recordsFailed,
      destinationType,
      destinationName,
      durationMs,
      jobId,
      triggeredBy,
      status,
      errorMessage
    } = body

    // Validation
    if (!sourceType || !sourceName || !transformationType || !transformationName || 
        !destinationType || !destinationName || recordsProcessed === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Calculate throughput
    const throughputRPS = durationMs > 0
      ? (recordsProcessed / (durationMs / 1000))
      : null

    // Create lineage record
    const lineage = await prisma.dataLineage.create({
      data: {
        sourceType,
        sourceName,
        sourceVersion: sourceVersion || null,
        transformationType,
        transformationName,
        recordsProcessed,
        recordsSucceeded: recordsSucceeded ?? recordsProcessed,
        recordsFailed: recordsFailed ?? 0,
        destinationType,
        destinationName,
        durationMs: durationMs || 0,
        throughputRPS,
        jobId: jobId || null,
        triggeredBy: triggeredBy || null,
        status: status || 'Success',
        errorMessage: errorMessage || null
      }
    })

    return NextResponse.json({
      success: true,
      data: lineage
    }, { status: 201 })

  } catch (error) {
    console.error('POST /api/data-lineage error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
