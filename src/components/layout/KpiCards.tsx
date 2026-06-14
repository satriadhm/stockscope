"use client";

import React, { useMemo } from "react";

import { useTranslations } from "next-intl";

import type { AnalyticsStats, Stock } from "@/types";

interface KpiCardsProps {
  stats: AnalyticsStats | null;
  loading?: boolean;
  tierFilter: Stock["tier"] | null;
  setTierFilter: (tier: Stock["tier"] | null) => void;
}

type KpiCard = {
  label: string;
  val: string | number | undefined;
  sub?: string;
  color: string;
  click?: () => void;
};

export function KpiCards({
  stats,
  loading = false,
  tierFilter,
  setTierFilter,
}: KpiCardsProps): React.ReactElement | null {
  const t = useTranslations("kpi");

  const cards = useMemo((): KpiCard[] | null => {
    if (loading || !stats) return null;
    return [
      { label: t("totalStocks"), val: stats.totalStocks, color: "#a8c8e8" },
      {
        label: t("redRisk"),
        val: stats.byTier.red,
        sub: t("pctOfTotal", {
          pct: stats.totalStocks
            ? Math.round((stats.byTier.red / stats.totalStocks) * 100)
            : 0,
        }),
        color: "var(--color-negative)",
        click: () => setTierFilter(tierFilter === "Red" ? null : "Red"),
      },
      {
        label: t("amberRisk"),
        val: stats.byTier.amber,
        color: "var(--color-warning)",
        click: () => setTierFilter(tierFilter === "Amber" ? null : "Amber"),
      },
      {
        label: t("greenRisk"),
        val: stats.byTier.green,
        color: "var(--color-positive)",
        click: () => setTierFilter(tierFilter === "Green" ? null : "Green"),
      },
      {
        label: t("avgHhi"),
        val: stats.avgHHI?.toFixed(0),
        sub: t("hhiHighConc"),
        color: stats.avgHHI > 2500 ? "var(--color-negative)" : "var(--color-warning)",
      },
      {
        label: t("avgFloat"),
        val: stats.avgFloat?.toFixed(1) + "%",
        sub: t("idxMin"),
        color: stats.avgFloat < 15 ? "var(--color-negative)" : "var(--color-positive)",
      },
    ];
  }, [loading, stats, t, tierFilter, setTierFilter]);

  if (loading || !stats || !cards) {
    return (
      <div className="kpi-cards" data-tour="kpi-cards">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            style={{
              background: "var(--bg-app)",
              padding: "14px 18px",
              borderRight: "1px solid var(--bg-surface)",
            }}
          >
            <div
              style={{
                height: 10,
                background: "var(--bg-surface)",
                borderRadius: 2,
                width: "60%",
                marginBottom: 8,
              }}
            />
            <div
              style={{
                height: 24,
                background: "var(--bg-surface)",
                borderRadius: 2,
                width: "40%",
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="kpi-cards" data-tour="kpi-cards">
      {cards.map((k) => (
        <div
          key={k.label}
          onClick={k.click}
          style={{
            background: "var(--bg-app)",
            padding: "14px 18px",
            cursor: k.click ? "pointer" : "default",
            borderRight: "1px solid var(--bg-surface)",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) =>
            k.click && (e.currentTarget.style.background = "var(--bg-surface)")
          }
          onMouseLeave={(e) =>
            k.click && (e.currentTarget.style.background = "var(--bg-app)")
          }
        >
          <div
            style={{
              fontSize: 9,
              letterSpacing: 2,
              color: "var(--text-secondary)",
              marginBottom: 4,
            }}
          >
            {k.label}
          </div>
          <div
            className="tabular-data"
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: k.color,
            }}
          >
            {k.val}
          </div>
          {k.sub && (
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
              {k.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
