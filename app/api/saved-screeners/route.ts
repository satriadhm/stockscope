/**
 * Saved Screeners API - List and Create
 * GET /api/saved-screeners - List user's saved screeners
 * POST /api/saved-screeners - Create new saved screener
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/prisma';
import { checkActionLimit } from '@/lib/feature-gate-middleware';

// GET /api/saved-screeners - List all saved screeners for authenticated user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const screeners = await prisma.savedScreener.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        filters: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(screeners);
  } catch (error) {
    console.error('[Saved Screeners GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/saved-screeners - Create new saved screener
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, filters } = body;

    // Check saved screener limits based on plan
    const currentScreeners = await prisma.savedScreener.count({
      where: { userId: user.id },
    });

    const limitCheck = await checkActionLimit('savedScreeners', currentScreeners);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Saved screener limit reached',
          message: limitCheck.message,
          currentCount: currentScreeners,
          limit: limitCheck.limit,
          upgradeUrl: '/pricing',
        },
        { status: 402 }
      );
    }

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Screener name is required' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Name must be 100 characters or less' },
        { status: 400 }
      );
    }

    if (description && description.length > 500) {
      return NextResponse.json(
        { error: 'Description must be 500 characters or less' },
        { status: 400 }
      );
    }

    if (!filters || typeof filters !== 'object') {
      return NextResponse.json(
        { error: 'Filters object is required' },
        { status: 400 }
      );
    }

    // Validate filter structure (optional fields)
    const validFilterKeys = [
      'sector',
      'aiTier',
      'govTier',
      'minScore',
      'maxScore',
      'sortBy',
      'sortOrder',
      'searchQuery',
    ];

    const invalidKeys = Object.keys(filters).filter(
      (key) => !validFilterKeys.includes(key)
    );

    if (invalidKeys.length > 0) {
      return NextResponse.json(
        { error: `Invalid filter keys: ${invalidKeys.join(', ')}` },
        { status: 400 }
      );
    }

    // Create saved screener
    const screener = await prisma.savedScreener.create({
      data: {
        userId: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        filters,
      },
    });

    return NextResponse.json(screener, { status: 201 });
  } catch (error) {
    console.error('[Saved Screeners POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
