import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/prisma';

// =============================================================================
// GET /api/v1/usage - Get API Usage Metrics
// =============================================================================
// Query user's API usage metrics with flexible time ranges and grouping

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const apiKeyId = searchParams.get('apiKeyId'); // Optional: filter by specific key
    const days = parseInt(searchParams.get('days') || '7'); // Default: 7 days
    const groupBy = searchParams.get('groupBy') || 'day'; // 'hour' | 'day' | 'endpoint'

    // Validate days parameter
    if (days < 1 || days > 90) {
      return NextResponse.json(
        { error: 'days parameter must be between 1 and 90' },
        { status: 400 }
      );
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Build query filter
    const where: any = {
      userId: user.id,
      hour: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (apiKeyId) {
      // Verify ownership of API key
      const apiKey = await prisma.apiKey.findUnique({
        where: { id: apiKeyId },
      });

      if (!apiKey || apiKey.userId !== user.id) {
        return NextResponse.json(
          { error: 'API key not found or access denied' },
          { status: 404 }
        );
      }

      where.apiKeyId = apiKeyId;
    }

    // Fetch usage data
    const usageData = await prisma.apiUsageHourly.findMany({
      where,
      select: {
        hour: true,
        apiKeyId: true,
        endpoint: true,
        method: true,
        requestCount: true,
        successCount: true,
        errorCount: true,
        error4xxCount: true,
        error5xxCount: true,
        avgResponseTime: true,
        bytesTransferred: true,
      },
      orderBy: {
        hour: 'asc',
      },
    });

    // Aggregate data based on groupBy parameter
    let aggregated: any[];

    if (groupBy === 'hour') {
      // Group by hour (no aggregation needed, raw data)
      aggregated = usageData.map((record) => ({
        timestamp: record.hour.toISOString(),
        requests: record.requestCount,
        errors: record.errorCount,
        errorRate: record.requestCount > 0 ? (record.errorCount / record.requestCount) * 100 : 0,
        avgResponseTime: Math.round(record.avgResponseTime),
        endpoint: record.endpoint,
        method: record.method,
      }));
    } else if (groupBy === 'day') {
      // Group by day
      const byDay = new Map<string, any>();

      for (const record of usageData) {
        const day = record.hour.toISOString().split('T')[0]; // YYYY-MM-DD

        if (!byDay.has(day)) {
          byDay.set(day, {
            date: day,
            requests: 0,
            errors: 0,
            error4xxCount: 0,
            error5xxCount: 0,
            totalResponseTime: 0,
            bytesTransferred: 0,
          });
        }

        const dayData = byDay.get(day);
        dayData.requests += record.requestCount;
        dayData.errors += record.errorCount;
        dayData.error4xxCount += record.error4xxCount;
        dayData.error5xxCount += record.error5xxCount;
        dayData.totalResponseTime += record.avgResponseTime * record.requestCount;
        dayData.bytesTransferred += record.bytesTransferred;
      }

      aggregated = Array.from(byDay.values()).map((day) => ({
        date: day.date,
        requests: day.requests,
        errors: day.errors,
        errorRate: day.requests > 0 ? (day.errors / day.requests) * 100 : 0,
        error4xxCount: day.error4xxCount,
        error5xxCount: day.error5xxCount,
        avgResponseTime: day.requests > 0 ? Math.round(day.totalResponseTime / day.requests) : 0,
        bytesTransferred: day.bytesTransferred,
      }));
    } else if (groupBy === 'endpoint') {
      // Group by endpoint
      const byEndpoint = new Map<string, any>();

      for (const record of usageData) {
        const key = `${record.method} ${record.endpoint}`;

        if (!byEndpoint.has(key)) {
          byEndpoint.set(key, {
            endpoint: record.endpoint,
            method: record.method,
            requests: 0,
            errors: 0,
            totalResponseTime: 0,
            bytesTransferred: 0,
          });
        }

        const endpointData = byEndpoint.get(key);
        endpointData.requests += record.requestCount;
        endpointData.errors += record.errorCount;
        endpointData.totalResponseTime += record.avgResponseTime * record.requestCount;
        endpointData.bytesTransferred += record.bytesTransferred;
      }

      aggregated = Array.from(byEndpoint.values())
        .map((endpoint) => ({
          endpoint: endpoint.endpoint,
          method: endpoint.method,
          requests: endpoint.requests,
          errors: endpoint.errors,
          errorRate: endpoint.requests > 0 ? (endpoint.errors / endpoint.requests) * 100 : 0,
          avgResponseTime: endpoint.requests > 0 ? Math.round(endpoint.totalResponseTime / endpoint.requests) : 0,
          bytesTransferred: endpoint.bytesTransferred,
        }))
        .sort((a, b) => b.requests - a.requests); // Sort by request count
    } else {
      return NextResponse.json(
        { error: 'Invalid groupBy parameter. Use: hour, day, or endpoint' },
        { status: 400 }
      );
    }

    // Calculate summary statistics
    const totalRequests = usageData.reduce((sum, r) => sum + r.requestCount, 0);
    const totalErrors = usageData.reduce((sum, r) => sum + r.errorCount, 0);
    const totalResponseTime = usageData.reduce(
      (sum, r) => sum + r.avgResponseTime * r.requestCount,
      0
    );

    const summary = {
      totalRequests,
      totalErrors,
      errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
      avgResponseTime: totalRequests > 0 ? Math.round(totalResponseTime / totalRequests) : 0,
      uniqueEndpoints: new Set(usageData.map((r) => r.endpoint)).size,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days,
      },
    };

    return NextResponse.json({
      success: true,
      summary,
      data: aggregated,
      groupBy,
      count: aggregated.length,
    });
  } catch (error) {
    console.error('Error fetching API usage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
