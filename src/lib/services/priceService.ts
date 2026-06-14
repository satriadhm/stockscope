/**
 * Price service layer
 *
 * Fetches real-time-ish quotes for IDX equities from Yahoo Finance.
 *
 * Design notes:
 * - IDX tickers map to Yahoo symbols by appending the ".JK" suffix
 *   (e.g. internal code "BBCA" -> Yahoo symbol "BBCA.JK").
 * - Yahoo quote data is unofficial and typically ~15 minutes delayed, which is
 *   acceptable for a screener. Swap this provider out for a paid vendor if a
 *   contractual SLA or true real-time is required.
 * - Only price-feed fields (lastPrice, volume, marketCap) come from here.
 *   Ownership/concentration fields stay sourced from MongoDB.
 */
import axios from "axios";

const YAHOO_QUOTE_URL = "https://query1.finance.yahoo.com/v7/finance/quote";

// Yahoo rate-limits large symbol lists; keep batches conservative.
const BATCH_SIZE = 50;

export interface Quote {
  /** Internal stock code (no exchange suffix), e.g. "BBCA". */
  code: string;
  lastPrice: number;
  volume?: number;
  marketCap?: number;
}

/** Convert an internal IDX code to a Yahoo Finance symbol. */
export function toYahooSymbol(code: string): string {
  return `${code.toUpperCase()}.JK`;
}

/** Convert a Yahoo Finance symbol back to an internal IDX code. */
export function fromYahooSymbol(symbol: string): string {
  return symbol.replace(/\.JK$/i, "").toUpperCase();
}

interface YahooQuoteResult {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketVolume?: number;
  marketCap?: number;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * Fetch quotes for the given internal stock codes.
 *
 * Resolves to a map keyed by internal code. Symbols that fail to resolve are
 * simply omitted so callers can fall back to last-known prices.
 */
export async function fetchQuotes(codes: string[]): Promise<Map<string, Quote>> {
  const result = new Map<string, Quote>();
  const uniqueCodes = [...new Set(codes.map((c) => c.toUpperCase()))];
  if (uniqueCodes.length === 0) return result;

  for (const batch of chunk(uniqueCodes, BATCH_SIZE)) {
    const symbols = batch.map(toYahooSymbol).join(",");
    try {
      const response = await axios.get(YAHOO_QUOTE_URL, {
        params: { symbols },
        timeout: 10_000,
        headers: { "User-Agent": "Mozilla/5.0 (StockScope)" },
      });

      const quotes: YahooQuoteResult[] =
        response.data?.quoteResponse?.result ?? [];

      for (const q of quotes) {
        if (!q.symbol || typeof q.regularMarketPrice !== "number") continue;
        const code = fromYahooSymbol(q.symbol);
        result.set(code, {
          code,
          lastPrice: q.regularMarketPrice,
          volume: q.regularMarketVolume,
          marketCap: q.marketCap,
        });
      }
    } catch (error) {
      // Non-fatal: a failed batch leaves those codes without a fresh quote,
      // and callers keep the last-known DB price.
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[priceService] quote fetch failed for batch: ${message}`);
    }
  }

  return result;
}
