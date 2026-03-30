/**
 * Saved Screener Detail API - Get, Update, Delete single saved screener
 * GET /api/saved-screeners/[id] - Get saved screener
 * PATCH /api/saved-screeners/[id] - Update saved screener
 * DELETE /api/saved-screeners/[id] - Delete saved screener
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/saved-screeners/[id] - Get single saved screener
export async function GET(
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

    const { id } = await context.params;

    const screener = await prisma.savedScreener.findUnique({
      where: { id },
    });

    if (!screener) {
      return NextResponse.json(
        { error: 'Saved screener not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (screener.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json(screener);
  } catch (error) {
    console.error('[Saved Screener GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/saved-screeners/[id] - Update saved screener
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

    const { id } = await context.params;

    const screener = await prisma.savedScreener.findUnique({
      where: { id },
    });

    if (!screener) {
      return NextResponse.json(
        { error: 'Saved screener not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (screener.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, filters } = body;

    // Build update data
    const updateData: {
      name?: string;
      description?: string | null;
      filters?: object;
    } = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Name must be a non-empty string' },
          { status: 400 }
        );
      }
      if (name.length > 100) {
        return NextResponse.json(
          { error: 'Name must be 100 characters or less' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      if (description && description.length > 500) {
        return NextResponse.json(
          { error: 'Description must be 500 characters or less' },
          { status: 400 }
        );
      }
      updateData.description = description?.trim() || null;
    }

    if (filters !== undefined) {
      if (typeof filters !== 'object' || filters === null) {
        return NextResponse.json(
          { error: 'Filters must be an object' },
          { status: 400 }
        );
      }

      // Validate filter keys
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

      updateData.filters = filters;
    }

    const updated = await prisma.savedScreener.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[Saved Screener PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/saved-screeners/[id] - Delete saved screener
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

    const { id } = await context.params;

    const screener = await prisma.savedScreener.findUnique({
      where: { id },
    });

    if (!screener) {
      return NextResponse.json(
        { error: 'Saved screener not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (screener.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    await prisma.savedScreener.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Saved Screener DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
