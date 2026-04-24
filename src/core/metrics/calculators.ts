import type { Financials } from "@/types/stock";
import type { Metrics } from "@/types/metrics";

/**
 * Compute precomputed financial metrics from raw financials.
 *
 * @param financials - Single-period financials for a stock
 * @param marketPrice - Current share price (for market-multiple calculations)
 * @param bookValuePerShare - Book value per share
 * @returns Computed Metrics object; fields default to 0 when inputs are invalid
 */
export function computeMetrics(
  financials: Financials,
  marketPrice: number,
  bookValuePerShare: number,
  previousRevenue?: number,
): Metrics {
  const { symbol, period, revenue, netIncome, totalEquity } = financials;

  const eps = netIncome && revenue ? netIncome / Math.max(revenue, 1) : 0;
  const pe = eps > 0 && marketPrice > 0 ? marketPrice / eps : 0;
  const pbv =
    bookValuePerShare > 0 && marketPrice > 0
      ? marketPrice / bookValuePerShare
      : 0;
  const roe =
    totalEquity > 0 ? (netIncome / totalEquity) * 100 : 0;
  const revenueGrowth =
    previousRevenue && previousRevenue > 0
      ? ((revenue - previousRevenue) / previousRevenue) * 100
      : 0;
  const netMargin = revenue > 0 ? (netIncome / revenue) * 100 : 0;

  return {
    symbol,
    asOf: period,
    pe: round2(pe),
    pbv: round2(pbv),
    roe: round2(roe),
    revenueGrowth: round2(revenueGrowth),
    netMargin: round2(netMargin),
    debtToEquity: 0, // requires total-debt data not in base Financials type
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Derive a basic debt-to-equity ratio when total debt is available.
 */
export function computeDebtToEquity(
  totalDebt: number,
  totalEquity: number,
): number {
  if (totalEquity <= 0) return 0;
  return Math.round((totalDebt / totalEquity) * 100) / 100;
}
