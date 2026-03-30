/**
 * Company Master API
 * 
 * Manages static company information (issuer names, sectors, listing dates)
 * Separated from daily time-series data for better data architecture
 * 
 * Sprint 3, Task SP3-01: Split Master & Daily Fact Datasets
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/company-master
 * List all companies with optional filtering
 * 
 * Query params:
 *   - sector: Filter by sector (e.g., ?sector=Banking)
 *   - active: Filter by active status (e.g., ?active=true)
 *   - search: Search by ticker or issuer name (e.g., ?search=BBCA)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sector = searchParams.get('sector')
    const activeParam = searchParams.get('active')
    const search = searchParams.get('search')

    // Build filter object
    const where: any = {}
    
    if (sector) {
      where.sector = sector
    }
    
    if (activeParam !== null) {
      where.isActive = activeParam === 'true'
    }
    
    if (search) {
      where.OR = [
        { ticker: { contains: search, mode: 'insensitive' } },
        { issuerName: { contains: search, mode: 'insensitive' } }
      ]
    }

    const companies = await prisma.companyMaster.findMany({
      where,
      orderBy: { ticker: 'asc' },
      select: {
        id: true,
        ticker: true,
        issuerName: true,
        sector: true,
        subsector: true,
        listingDate: true,
        sharesListed: true,
        boardType: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      count: companies.length,
      data: companies
    })

  } catch (error) {
    console.error('GET /api/company-master error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/company-master
 * Create a new company master record
 * 
 * Body:
 * {
 *   ticker: "BBCA",
 *   issuerName: "Bank Central Asia Tbk",
 *   sector: "Banking",
 *   subsector: "Commercial Bank",
 *   listingDate: "2000-05-31",
 *   sharesListed: 121654000000,
 *   isin: "ID1000109507",
 *   boardType: "Main Board"
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
      issuerName,
      sector,
      subsector,
      listingDate,
      sharesListed,
      isin,
      boardType
    } = body

    // Validation
    if (!ticker || !issuerName || !sector) {
      return NextResponse.json(
        { error: 'Missing required fields: ticker, issuerName, sector' },
        { status: 400 }
      )
    }

    // Check for duplicates
    const existing = await prisma.companyMaster.findUnique({
      where: { ticker: ticker.toUpperCase() }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Company with this ticker already exists' },
        { status: 409 }
      )
    }

    // Create company
    const company = await prisma.companyMaster.create({
      data: {
        ticker: ticker.toUpperCase(),
        issuerName,
        sector,
        subsector: subsector || null,
        listingDate: listingDate ? new Date(listingDate) : null,
        sharesListed: sharesListed ? BigInt(sharesListed) : null,
        isin: isin || null,
        boardType: boardType || null,
        isActive: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        ...company,
        sharesListed: company.sharesListed?.toString() // Convert BigInt to string for JSON
      }
    }, { status: 201 })

  } catch (error) {
    console.error('POST /api/company-master error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
