import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/prisma';
import { invalidateCachedApiKey } from '@/lib/rate-limit';

/**
 * GET /api/v1/api-keys/[id]
 * Get a specific API key details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = await prisma.apiKey.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        rateLimit: true,
        isActive: true,
        ipWhitelist: true,
        lastUsedAt: true,
        createdAt: true,
        userId: true,
      },
    });

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Ensure user owns this key
    if (apiKey.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(apiKey);
  } catch (error) {
    console.error('Error fetching API key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/api-keys/[id]
 * Update an API key (name, status, scopes, etc.)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const existingKey = await prisma.apiKey.findUnique({
      where: { id },
      select: { userId: true, keyPrefix: true },
    });

    if (!existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    if (existingKey.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, isActive, scopes, ipWhitelist } = body;

    // Build update object
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (scopes !== undefined) updateData.scopes = scopes;
    if (ipWhitelist !== undefined) updateData.ipWhitelist = ipWhitelist;

    const updatedKey = await prisma.apiKey.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        rateLimit: true,
        isActive: true,
        ipWhitelist: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    // Invalidate cache when revoking or updating scopes
    if (isActive === false || scopes !== undefined) {
      await invalidateCachedApiKey(existingKey.keyPrefix);
    }

    return NextResponse.json(updatedKey);
  } catch (error) {
    console.error('Error updating API key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/api-keys/[id]
 * Delete an API key (hard delete)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const existingKey = await prisma.apiKey.findUnique({
      where: { id },
      select: { userId: true, keyPrefix: true },
    });

    if (!existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    if (existingKey.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the key
    await prisma.apiKey.delete({
      where: { id },
    });

    // Invalidate cache
    await invalidateCachedApiKey(existingKey.keyPrefix);

    return NextResponse.json({ success: true, message: 'API key deleted' });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
