/**
 * Watchlist Items API - Add, Remove, Reorder stocks
 * POST /api/watchlists/[id]/items - Add stock to watchlist
 * DELETE /api/watchlists/[id]/items - Remove stock from watchlist
 * PATCH /api/watchlists/[id]/items - Reorder items (bulk update positions)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// POST /api/watchlists/[id]/items - Add stock to watchlist
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
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

    const { id: watchlistId } = await context.params;

    const watchlist = await prisma.watchlist.findUnique({
      where: { id: watchlistId },
    });

    if (!watchlist) {
      return NextResponse.json(
        { error: 'Watchlist not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (watchlist.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { ticker, notes } = body;

    // Validation
    if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0) {
      return NextResponse.json(
        { error: 'Stock ticker is required' },
        { status: 400 }
      );
    }

    const normalizedTicker = ticker.trim().toUpperCase();

    // Check if ticker already in watchlist
    const existingItem = await prisma.watchlistItem.findFirst({
      where: {
        watchlistId,
        ticker: normalizedTicker,
      },
    });

    if (existingItem) {
      return NextResponse.json(
        { error: 'Stock already in watchlist' },
        { status: 409 }
      );
    }

    // Find max position
    const lastItem = await prisma.watchlistItem.findFirst({
      where: { watchlistId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const newPosition = lastItem ? lastItem.position + 1 : 0;

    // Create item
    const item = await prisma.watchlistItem.create({
      data: {
        watchlistId,
        ticker: normalizedTicker,
        notes: notes?.trim() || null,
        position: newPosition,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('[Watchlist Items POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/watchlists/[id]/items?ticker=BBCA - Remove stock from watchlist
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
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

    const { id: watchlistId } = await context.params;
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');

    if (!ticker) {
      return NextResponse.json(
        { error: 'Ticker query parameter is required' },
        { status: 400 }
      );
    }

    const watchlist = await prisma.watchlist.findUnique({
      where: { id: watchlistId },
    });

    if (!watchlist) {
      return NextResponse.json(
        { error: 'Watchlist not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (watchlist.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const normalizedTicker = ticker.trim().toUpperCase();

    const item = await prisma.watchlistItem.findFirst({
      where: {
        watchlistId,
        ticker: normalizedTicker,
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Stock not found in watchlist' },
        { status: 404 }
      );
    }

    await prisma.watchlistItem.delete({
      where: { id: item.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Watchlist Items DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/watchlists/[id]/items - Reorder items (bulk update positions)
// Body: { items: [{ id, position }] }
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
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

    const { id: watchlistId } = await context.params;

    const watchlist = await prisma.watchlist.findUnique({
      where: { id: watchlistId },
    });

    if (!watchlist) {
      return NextResponse.json(
        { error: 'Watchlist not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (watchlist.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Items must be an array' },
        { status: 400 }
      );
    }

    // Validate each item
    for (const item of items) {
      if (!item.id || typeof item.position !== 'number' || item.position < 0) {
        return NextResponse.json(
          { error: 'Each item must have id and non-negative position' },
          { status: 400 }
        );
      }
    }

    // Update positions in transaction
    await prisma.$transaction(
      items.map((item) =>
        prisma.watchlistItem.update({
          where: { id: item.id },
          data: { position: item.position },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Watchlist Items PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
