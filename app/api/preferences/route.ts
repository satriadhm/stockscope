/**
 * User Preferences API
 * GET /api/preferences - Get current user preferences
 * PATCH /api/preferences - Update user preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/prisma';

// GET /api/preferences - Get user preferences (create if not exists)
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

    // Find or create preferences
    let preferences = await prisma.userPreferences.findUnique({
      where: { userId: user.id },
    });

    if (!preferences) {
      // Create default preferences
      preferences = await prisma.userPreferences.create({
        data: {
          userId: user.id,
          language: 'en',
          theme: 'dark',
          defaultView: 'table',
          emailNotifications: true,
          pushNotifications: false,
        },
      });
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('[Preferences GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/preferences - Update user preferences
export async function PATCH(request: NextRequest) {
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
    const {
      language,
      theme,
      defaultView,
      emailNotifications,
      pushNotifications,
    } = body;

    // Validation
    const updateData: {
      language?: string;
      theme?: string;
      defaultView?: string;
      emailNotifications?: boolean;
      pushNotifications?: boolean;
    } = {};

    if (language !== undefined) {
      if (!['en', 'id'].includes(language)) {
        return NextResponse.json(
          { error: 'Language must be "en" or "id"' },
          { status: 400 }
        );
      }
      updateData.language = language;
    }

    if (theme !== undefined) {
      if (!['light', 'dark', 'system'].includes(theme)) {
        return NextResponse.json(
          { error: 'Theme must be "light", "dark", or "system"' },
          { status: 400 }
        );
      }
      updateData.theme = theme;
    }

    if (defaultView !== undefined) {
      if (!['table', 'cards'].includes(defaultView)) {
        return NextResponse.json(
          { error: 'Default view must be "table" or "cards"' },
          { status: 400 }
        );
      }
      updateData.defaultView = defaultView;
    }

    if (typeof emailNotifications === 'boolean') {
      updateData.emailNotifications = emailNotifications;
    }

    if (typeof pushNotifications === 'boolean') {
      updateData.pushNotifications = pushNotifications;
    }

    // Upsert preferences
    const preferences = await prisma.userPreferences.upsert({
      where: { userId: user.id },
      update: updateData,
      create: {
        userId: user.id,
        language: language || 'en',
        theme: theme || 'dark',
        defaultView: defaultView || 'table',
        emailNotifications: emailNotifications ?? true,
        pushNotifications: pushNotifications ?? false,
      },
    });

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('[Preferences PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
