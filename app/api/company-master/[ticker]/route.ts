/**
 * Company Master Detail API
 * 
 * Get, update, or deactivate specific company records
 * 
 * Sprint 3, Task SP3-01: Split Master & Daily Fact Datasets
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/company-master/[ticker]
 * Get detailed company information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ticker } = await params

    const company = await prisma.companyMaster.findUnique({
      where: { ticker: ticker.toUpperCase() },
      include: {
        _count: {
          select: { dailyFacts: true } // Count of historical records
        }
      }
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...company,
        sharesListed: company.sharesListed?.toString()
      }
    })

  } catch (error) {
    console.error(`GET /api/company-master/[ticker] error:`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/company-master/[ticker]
 * Update company information
 * 
 * Body: Partial company fields to update
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ticker } = await params
    const body = await request.json()

    // Check if company exists
    const existing = await prisma.companyMaster.findUnique({
      where: { ticker: ticker.toUpperCase() }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    // Prevent ticker changes (it's the primary identifier)
    if (body.ticker && body.ticker.toUpperCase() !== ticker.toUpperCase()) {
      return NextResponse.json(
        { error: 'Cannot change ticker symbol' },
        { status: 400 }
      )
    }

    // Update company
    const updateData: any = {}
    
    if (body.issuerName) updateData.issuerName = body.issuerName
    if (body.sector) updateData.sector = body.sector
    if (body.subsector !== undefined) updateData.subsector = body.subsector || null
    if (body.listingDate !== undefined) {
      updateData.listingDate = body.listingDate ? new Date(body.listingDate) : null
    }
    if (body.sharesListed !== undefined) {
      updateData.sharesListed = body.sharesListed ? BigInt(body.sharesListed) : null
    }
    if (body.isin !== undefined) updateData.isin = body.isin || null
    if (body.boardType !== undefined) updateData.boardType = body.boardType || null
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    const company = await prisma.companyMaster.update({
      where: { ticker: ticker.toUpperCase() },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      data: {
        ...company,
        sharesListed: company.sharesListed?.toString()
      }
    })

  } catch (error) {
    console.error(`PUT /api/company-master/[ticker] error:`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/company-master/[ticker]
 * Mark company as inactive (soft delete)
 * 
 * Note: This doesn't delete historical daily facts, just marks as delisted
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ticker } = await params

    // Check if company exists
    const existing = await prisma.companyMaster.findUnique({
      where: { ticker: ticker.toUpperCase() }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    // Soft delete by marking as inactive
    const company = await prisma.companyMaster.update({
      where: { ticker: ticker.toUpperCase() },
      data: { isActive: false }
    })

    return NextResponse.json({
      success: true,
      message: 'Company marked as inactive',
      data: {
        ...company,
        sharesListed: company.sharesListed?.toString()
      }
    })

  } catch (error) {
    console.error(`DELETE /api/company-master/[ticker] error:`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
