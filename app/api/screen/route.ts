import { NextRequest, NextResponse } from "next/server";

import { getDB } from "@/lib/mongodb";
import { enrichStocks } from "@/lib/services/enrichmentService";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = 50;
    const skip = (page - 1) * limit;

    const sector = searchParams.get("sector");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");

    const matchStage: Record<string, any> = {};

    // Reverse mapping from Sector to DB stored format (hierarchyLevel)
    if (sector && sector !== "All") {
      if (sector === "Finance") {
        matchStage.hierarchyLevel = "High";
      } else if (sector === "Infrastructure") {
        matchStage.hierarchyLevel = "Moderate";
      } else if (sector === "Miscellaneous Industry") {
        matchStage.hierarchyLevel = "Low";
      } else {
        matchStage.sector = sector; // fallback
      }
    }

    if (minPrice || maxPrice) {
      matchStage.lastPrice = {};
      if (minPrice) matchStage.lastPrice.$gte = Number(minPrice);
      if (maxPrice) matchStage.lastPrice.$lte = Number(maxPrice);
    }

    const database = await getDB();
    
    // Aggregation pipeline to do filtering, count total, and paginate inside the DB
    const pipeline = [
      { $match: matchStage },
      { $sort: { lastPrice: -1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },
    ];

    const result = await database
      .collection("stocks")
      .aggregate(pipeline)
      .toArray();

    const metadata = result[0]?.metadata[0] || { total: 0 };
    const rawData = result[0]?.data || [];

    // Format like the original screener but we only map what's fetched this page!
    const enriched = enrichStocks(rawData);

    const data = enriched.map((s) => ({
      ticker: s.code,
      name: s.issuer,
      sector: s.sector,
      price: s.price,
      change: s.change,
      volume: s.volume,
      marketCap: s.marketCap,
      pe: s.pe,
      pb: s.pb,
      roe: s.roe,
      dividendYield: s.dividendYield,
      scores: s.scores
        ? {
            composite: s.scores.composite,
            fundamental: s.scores.fundamental,
            technical: s.scores.technical,
            sentiment: s.scores.sentiment,
            liquidity: s.scores.liquidity,
          }
        : {
            composite: 0,
            fundamental: 0,
            technical: 0,
            sentiment: 0,
            liquidity: 0,
          },
      tier: s.aiTier || {
        level: 5,
        label: "N/A",
        color: "#999",
        bg: "rgba(153,153,153,0.12)",
      },
    }));

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      total: metadata.total,
      page,
      limit,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
