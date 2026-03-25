'use client';

import React from 'react';
import type { AnalyticsStats, Stock } from '@/lib/types';

interface KpiCardsProps {
  stats: AnalyticsStats | null;
  loading?: boolean;
  tierFilter: Stock['tier'] | null;
  setTierFilter: (tier: Stock['tier'] | null) => void;
}

export function KpiCards({ stats, loading = false, tierFilter, setTierFilter }: KpiCardsProps): React.ReactElement | null {
  if (loading || !stats) {
    return (
      <div className="kpi-cards" data-tour="kpi-cards">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            style={{
              background: '#09131f',
              padding: '14px 18px',
              borderRight: '1px solid #132030',
            }}
          >
            <div style={{ height: 10, background: '#1e3a52', borderRadius: 2, width: '60%', marginBottom: 8 }} />
            <div style={{ height: 24, background: '#1e3a52', borderRadius: 2, width: '40%' }} />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    { label: 'TOTAL STOCKS', val: stats.totalStocks, color: '#a8c8e8' },
    {
      label: '🔴 RED RISK',
      val: stats.byTier.red,
      sub: `${stats.totalStocks ? Math.round((stats.byTier.red / stats.totalStocks) * 100) : 0}% of total`,
      color: '#E76F51',
      click: () => setTierFilter(tierFilter === 'Red' ? null : 'Red'),
    },
    {
      label: '🟡 AMBER RISK',
      val: stats.byTier.amber,
      color: '#E9C46A',
      click: () => setTierFilter(tierFilter === 'Amber' ? null : 'Amber'),
    },
    {
      label: '🟢 GREEN RISK',
      val: stats.byTier.green,
      color: '#2A9D8F',
      click: () => setTierFilter(tierFilter === 'Green' ? null : 'Green'),
    },
    {
      label: 'AVG HHI',
      val: stats.avgHHI?.toFixed(0),
      sub: 'High conc. >2,500',
      color: stats.avgHHI > 2500 ? '#E76F51' : '#E9C46A',
    },
    {
      label: 'AVG FREE FLOAT',
      val: stats.avgFloat?.toFixed(1) + '%',
      sub: 'IDX min: 15%',
      color: stats.avgFloat < 15 ? '#E76F51' : '#2A9D8F',
    },
  ];

  return (
    <div className="kpi-cards" data-tour="kpi-cards">
      {cards.map((k) => (
        <div
          key={k.label}
          onClick={k.click}
          style={{
            background: '#09131f',
            padding: '14px 18px',
            cursor: k.click ? 'pointer' : 'default',
            borderRight: '1px solid #132030',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => k.click && (e.currentTarget.style.background = '#0d1e30')}
          onMouseLeave={(e) => k.click && (e.currentTarget.style.background = '#09131f')}
        >
          <div style={{ fontSize: 9, letterSpacing: 2, color: '#457B9D', marginBottom: 4 }}>
            {k.label}
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              fontFamily: "'DM Mono', monospace",
              color: k.color,
            }}
          >
            {k.val}
          </div>
          {k.sub && (
            <div style={{ fontSize: 10, color: '#6b8aad', marginTop: 2 }}>
              {k.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
