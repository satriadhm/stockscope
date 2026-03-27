"use client";

import { ChangeIndicator } from "@/components/ui/ChangeIndicator";
import { SectorBadge } from "@/components/ui/SectorBadge";
import { TierBadge } from "@/components/ui/TierBadge";

import type { EnrichedStock } from "@/types/unified";

interface StockCardProps {
  stock: EnrichedStock;
  onClick?: () => void;
}

export function StockCard({
  stock,
  onClick,
}: StockCardProps): React.ReactElement {
  // Calculate change percent if we have price and change values
  const changePercent =
    stock.price && stock.change
      ? (stock.change / (stock.price - stock.change)) * 100
      : undefined;

  return (
    <button
      onClick={onClick}
      className="
        w-full text-left
        bg-surface-card
        border border-border-subtle rounded-xl p-4
        hover:border-border hover:bg-surface-elevated
        active:scale-[0.99]
        transition-all duration-150
        animate-fade-in
      "
    >
      {/* Header: Ticker + Name | Price + Change */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="ticker text-sm text-text-primary">
              {stock.code}
            </span>
            {stock.aiTier && (
              <TierBadge
                tier={
                  (["s", "a", "b", "c", "d"][
                    stock.aiTier.level - 1
                  ] as any) || "d"
                }
                size="sm"
              />
            )}
          </div>
          <p className="text-xs text-text-secondary line-clamp-1 max-w-[160px]">
            {stock.issuer}
          </p>
        </div>

        <div className="text-right ml-2 shrink-0">
          <p className="num text-sm font-semibold text-text-primary mb-1">
            Rp {stock.price?.toLocaleString?.("id-ID") ?? "—"}
          </p>
          {changePercent !== undefined && (
            <ChangeIndicator value={changePercent} showBg size="xs" />
          )}
        </div>
      </div>

      {/* Footer: Sector + Metrics */}
      <div className="flex items-center justify-between">
        {stock.sector && (
          <SectorBadge sector={stock.sector as any} size="sm" />
        )}

        <div className="flex gap-3">
          {stock.pe !== undefined && (
            <span className="text-2xs text-text-muted">
              PE{" "}
              <span className="num text-text-secondary font-medium">
                {stock.pe.toFixed(1)}x
              </span>
            </span>
          )}
          {stock.roe !== undefined && (
            <span className="text-2xs text-text-muted">
              ROE{" "}
              <span className="num text-text-secondary font-medium">
                {stock.roe.toFixed(1)}%
              </span>
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
