'use client';

import { FlagPill } from '@/components/ui';
import type { EnrichedStock } from '@/lib/types/unified';

interface ScreenerTableProps {
  stocks: EnrichedStock[];
  onSort: (field: string) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const SortIcon = ({ field, sortBy, sortOrder }: { field: string; sortBy: string; sortOrder: 'asc' | 'desc' }) => {
  if (sortBy !== field) return <span style={{ color: '#6b8aad', marginLeft: 4 }}>⇅</span>;
  return <span style={{ marginLeft: 4 }}>{sortOrder === 'asc' ? '↑' : '↓'}</span>;
};

export function ScreenerTable({ stocks, onSort, sortBy, sortOrder }: ScreenerTableProps) {
  const formatPrice = (price: number | undefined) => {
    if (!price) return '—';
    return price.toLocaleString('id-ID');
  };

  // Map governance tier to RTI colors
  const getGovTierStyle = (tier: string) => {
    const tierColors: Record<string, { color: string; bg: string }> = {
      'Red': { color: '#E76F51', bg: 'rgba(231, 111, 81, 0.12)' },
      'Amber': { color: '#E9C46A', bg: 'rgba(233, 196, 106, 0.12)' },
      'Green': { color: '#2A9D8F', bg: 'rgba(42, 157, 143, 0.12)' }
    };
    return tierColors[tier] || { color: '#6b8aad', bg: 'rgba(107, 138, 173, 0.12)' };
  };

  // Get HHI color
  const getHhiColor = (hhi: number | undefined) => {
    if (!hhi) return '#6b8aad';
    if (hhi < 1500) return '#2a9d8f';
    if (hhi <= 2500) return '#e9c46a';
    return '#e76f51';
  };

  // Score bar component
  const ScoreBar = ({ value }: { value: number | undefined }) => {
    if (!value) return <span>—</span>;

    let color = '#e76f51';
    if (value >= 80) color = '#2a9d8f';
    else if (value >= 65) color = '#457b9d';
    else if (value >= 50) color = '#e9c46a';

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 20, background: 'rgba(69, 123, 157, 0.1)', borderRadius: 2, overflow: 'hidden', border: '1px solid #1e3a52' }}>
          <div
            style={{
              height: '100%',
              width: `${value}%`,
              background: color,
              transition: 'width 0.3s ease'
            }}
          />
        </div>
        <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: color, minWidth: 30, textAlign: 'right', fontWeight: 600 }}>
          {value}
        </span>
      </div>
    );
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#060d18', borderBottom: '1px solid #132030' }}>
            <th style={{ padding: 12, textAlign: 'left', fontSize: 9, fontFamily: "'DM Mono', monospace", color: '#457b9d', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, cursor: 'pointer', userSelect: 'none' }} onClick={() => onSort('code')}>
              Ticker <SortIcon field="code" sortBy={sortBy} sortOrder={sortOrder} />
            </th>
            <th style={{ padding: 12, textAlign: 'left', fontSize: 9, fontFamily: "'DM Mono', monospace", color: '#457b9d', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
              Issuer
            </th>
            <th style={{ padding: 12, textAlign: 'left', fontSize: 9, fontFamily: "'DM Mono', monospace", color: '#457b9d', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
              Sector
            </th>
            <th style={{ padding: 12, textAlign: 'right', fontSize: 9, fontFamily: "'DM Mono', monospace", color: '#457b9d', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, cursor: 'pointer', userSelect: 'none' }} onClick={() => onSort('price')}>
              Price <SortIcon field="price" sortBy={sortBy} sortOrder={sortOrder} />
            </th>
            <th style={{ padding: 12, textAlign: 'right', fontSize: 9, fontFamily: "'DM Mono', monospace", color: '#457b9d', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, cursor: 'pointer', userSelect: 'none' }} onClick={() => onSort('change')}>
              Change % <SortIcon field="change" sortBy={sortBy} sortOrder={sortOrder} />
            </th>
            <th style={{ padding: 12, textAlign: 'left', fontSize: 9, fontFamily: "'DM Mono', monospace", color: '#457b9d', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, cursor: 'pointer', userSelect: 'none' }} onClick={() => onSort('composite')}>
              AI Score <SortIcon field="composite" sortBy={sortBy} sortOrder={sortOrder} />
            </th>
            <th style={{ padding: 12, textAlign: 'center', fontSize: 9, fontFamily: "'DM Mono', monospace", color: '#457b9d', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
              AI Tier
            </th>
            <th style={{ padding: 12, textAlign: 'center', fontSize: 9, fontFamily: "'DM Mono', monospace", color: '#457b9d', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
              Gov Tier
            </th>
            <th style={{ padding: 12, textAlign: 'right', fontSize: 9, fontFamily: "'DM Mono', monospace", color: '#457b9d', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, cursor: 'pointer', userSelect: 'none' }} onClick={() => onSort('hhi')}>
              HHI <SortIcon field="hhi" sortBy={sortBy} sortOrder={sortOrder} />
            </th>
            <th style={{ padding: 12, textAlign: 'left', fontSize: 9, fontFamily: "'DM Mono', monospace", color: '#457b9d', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
              Flags
            </th>
            <th style={{ padding: 12, textAlign: 'right', fontSize: 9, fontFamily: "'DM Mono', monospace", color: '#457b9d', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, cursor: 'pointer', userSelect: 'none' }} onClick={() => onSort('pe')}>
              P/E <SortIcon field="pe" sortBy={sortBy} sortOrder={sortOrder} />
            </th>
            <th style={{ padding: 12, textAlign: 'right', fontSize: 9, fontFamily: "'DM Mono', monospace", color: '#457b9d', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, cursor: 'pointer', userSelect: 'none' }} onClick={() => onSort('roe')}>
              ROE % <SortIcon field="roe" sortBy={sortBy} sortOrder={sortOrder} />
            </th>
            <th style={{ padding: 12, textAlign: 'right', fontSize: 9, fontFamily: "'DM Mono', monospace", color: '#457b9d', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, cursor: 'pointer', userSelect: 'none' }} onClick={() => onSort('dividendYield')}>
              Div Yield % <SortIcon field="dividendYield" sortBy={sortBy} sortOrder={sortOrder} />
            </th>
          </tr>
        </thead>
        <tbody>
          {stocks.length === 0 ? (
            <tr>
              <td colSpan={13} style={{ padding: 32, textAlign: 'center', color: '#6b8aad', fontSize: '0.875rem' }}>
                No stocks found matching your criteria
              </td>
            </tr>
          ) : (
            stocks.map((stock, idx) => {
              const govTierStyle = getGovTierStyle(stock.tier);
              return (
                <tr
                  key={stock.code}
                  style={{
                    background: idx % 2 === 0 ? '#09131f' : '#060d18',
                    borderBottom: '1px solid #132030',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#0d1e30')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? '#09131f' : '#060d18')}
                >
                  <td style={{ padding: 12, whiteSpace: 'nowrap', fontFamily: "'DM Mono', monospace", fontWeight: 700, color: '#a8d8ea', fontSize: '0.875rem' }}>
                    {stock.code}
                  </td>
                  <td style={{ padding: 12, fontSize: '0.875rem', color: '#e8f4f8' }}>
                    {stock.issuer}
                  </td>
                  <td style={{ padding: 12, fontSize: '0.875rem', color: '#a8c8e8' }}>
                    {stock.sector || '—'}
                  </td>
                  <td style={{ padding: 12, textAlign: 'right', fontSize: '0.875rem', color: '#e8f4f8', fontWeight: 500 }}>
                    {formatPrice(stock.price)}
                  </td>
                  <td style={{ padding: 12, textAlign: 'right', fontSize: '0.875rem', fontWeight: 500, color: stock.change && stock.change >= 0 ? '#2a9d8f' : '#e76f51' }}>
                    {stock.change ? (stock.change >= 0 ? '+' : '') + stock.change.toFixed(2) + '%' : '—'}
                  </td>
                  <td style={{ padding: 12, fontSize: '0.875rem', minWidth: 150 }}>
                    <ScoreBar value={stock.scores?.composite} />
                  </td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    {stock.aiTier ? (
                      <span
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          borderRadius: 4,
                          background: stock.aiTier.bg,
                          color: stock.aiTier.color,
                          border: `1px solid ${stock.aiTier.color}33`,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        T{stock.aiTier.level}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: govTierStyle.bg,
                        color: govTierStyle.color,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        border: `1px solid ${govTierStyle.color}66`
                      }}
                      title={stock.tier}
                    >
                      {stock.tier[0]}
                    </span>
                  </td>
                  <td style={{ padding: 12, textAlign: 'right', fontSize: '0.875rem', color: getHhiColor(stock.hhi), fontWeight: 500 }}>
                    {stock.hhi ? stock.hhi.toFixed(0) : '—'}
                  </td>
                  <td style={{ padding: 12, fontSize: '0.875rem' }}>
                    {stock.flags && stock.flags.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {stock.flags.map(flag => (
                          <FlagPill key={flag} flag={flag} />
                        ))}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ padding: 12, textAlign: 'right', fontSize: '0.875rem', color: '#e8f4f8' }}>
                    {stock.pe ? stock.pe.toFixed(1) : '—'}
                  </td>
                  <td style={{ padding: 12, textAlign: 'right', fontSize: '0.875rem', color: '#e8f4f8' }}>
                    {stock.roe ? stock.roe.toFixed(1) : '—'}
                  </td>
                  <td style={{ padding: 12, textAlign: 'right', fontSize: '0.875rem', color: '#e8f4f8' }}>
                    {stock.dividendYield ? stock.dividendYield.toFixed(2) : '—'}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
