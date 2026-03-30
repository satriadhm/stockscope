/**
 * Watchlists API - List and Create
 * GET /api/watchlists - List user's watchlists
 * POST /api/watchlists - Create new watchlist
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/prisma';

// GET /api/watchlists - List all watchlists for authenticated user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch watchlists with items count
    const watchlists = await prisma.watchlist.findMany({
      where: { userId: user.id },
      include: {
        items: {
          select: {
            ticker: true,
          },
        },
      },
      orderBy: { position: 'asc' },
    });

    // Transform response to include item count
    const response = watchlists.map((list) => ({
      id: list.id,
      name: list.name,
      description: list.description,
      color: list.color,
      position: list.position,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      itemCount: list.items.length,
      tickers: list.items.map((item) => item.ticker),
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Watchlists GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/watchlists - Create new watchlist
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find user by email
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
    const { name, description, color } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Watchlist name is required' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Watchlist name must be 100 characters or less' },
        { status: 400 }
      );
    }

    if (description && description.length > 500) {
      return NextResponse.json(
        { error: 'Description must be 500 characters or less' },
        { status: 400 }
      );
    }

    // Find max position for ordering
    const lastWatchlist = await prisma.watchlist.findFirst({
      where: { userId: user.id },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const newPosition = lastWatchlist ? lastWatchlist.position + 1 : 0;

    // Create watchlist
    const watchlist = await prisma.watchlist.create({
      data: {
        userId: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        color: color || null,
        position: newPosition,
      },
    });

    return NextResponse.json(watchlist, { status: 201 });
  } catch (error) {
    console.error('[Watchlists POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
