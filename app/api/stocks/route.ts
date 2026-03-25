/**
 * GET /api/stocks
 * Fetch stocks with filtering and sorting
 * Separation of Concerns: API layer handles HTTP, delegates to service
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { fetchStocks, countStocks } from '@/lib/services/stockService';
import { authOptions } from '@/lib/auth/config';
import { FREE_LIMIT } from '@/lib/auth/constants';
import type { Stock, StockFilter, ApiResponse, PaginatedResponse } from '@/lib/types';

interface StocksResponse extends PaginatedResponse<Stock> {}

export async function GET(request: NextRequest): Promise<NextResponse<StocksResponse>> {
  try {
    const session = await getServerSession(authOptions);
    const plan = (session?.user as { plan?: 'free' | 'premium' })?.plan ?? 'free';

    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters with type safety
    const tier = searchParams.get('tier');
    const hierarchyLevel = searchParams.get('hierarchyLevel');
    const flag = searchParams.get('flag');
    const search = searchParams.get('search');
    let limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 10000);
    if (plan === 'free') {
      limit = Math.min(limit, FREE_LIMIT);
    }
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const sortBy = searchParams.get('sortBy') || 'code';
    const sortDir = (searchParams.get('sortDir') as 'asc' | 'desc') || 'asc';

    // Build filter object with type safety
    const filter: StockFilter = {};
    if (tier === 'Red' || tier === 'Amber' || tier === 'Green') {
      filter.tier = tier;
    }
    if (hierarchyLevel) {
      filter.hierarchyLevel = hierarchyLevel;
    }
    if (flag) {
      filter.flag = flag;
    }
    if (search) {
      filter.searchText = search;
    }

    // Fetch stocks from service
    const stocks = await fetchStocks(filter, { limit, skip });
    const total = await countStocks(filter);

    return NextResponse.json<StocksResponse>({
      success: true,
      data: stocks,
      total,
      limit,
      skip,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stocks';
    console.error('Error fetching stocks:', error);

    return NextResponse.json<StocksResponse>(
      {
        success: false,
        data: [],
        error: errorMessage,
        total: 0,
        limit: 0,
        skip: 0,
      },
      { status: 500 }
    );
  }
}
