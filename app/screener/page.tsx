'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FilterPanel } from '@/components/screener/FilterPanel';
import { ScreenerTable } from '@/components/screener/ScreenerTable';
import type { EnrichedStock } from '@/lib/types/unified';

export default function ScreenerPage() {
  const [stocks, setStocks] = useState<EnrichedStock[]>([]);
  const [sectors, setSectors] = useState<string[]>(['All']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('All');
  const [selectedAiTier, setSelectedAiTier] = useState('');
  const [selectedGovTier, setSelectedGovTier] = useState<'Red' | 'Amber' | 'Green' | ''>('');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [sortBy, setSortBy] = useState('composite');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch sectors on mount
  useEffect(() => {
    fetch('/api/screener/filters')
      .then(res => res.json())
      .then(data => setSectors(data.sectors || ['All']))
      .catch(err => console.error('Failed to load sectors:', err));
  }, []);

  // Fetch stocks when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (selectedSector !== 'All') params.append('sector', selectedSector);
    if (selectedAiTier) params.append('aiTier', selectedAiTier);
    if (selectedGovTier) params.append('tier', selectedGovTier);
    if (minScore) params.append('minScore', minScore);
    if (maxScore) params.append('maxScore', maxScore);
    params.append('sortBy', sortBy);
    params.append('order', sortOrder);

    setLoading(true);
    fetch(`/api/stocks/enriched?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStocks(data.data);
          setError(null);
        } else {
          setError(data.error || 'Failed to load stocks');
        }
      })
      .catch(err => {
        console.error('Error fetching stocks:', err);
        setError('Failed to load stocks');
      })
      .finally(() => setLoading(false));
  }, [searchQuery, selectedSector, selectedAiTier, selectedGovTier, minScore, maxScore, sortBy, sortOrder]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div style={{ background: '#060d18', minHeight: '100vh' }}>
      {/* Dark Header */}
      <div style={{ padding: 'clamp(12px, 4vw, 20px) clamp(12px, 4vw, 28px) 14px', background: 'linear-gradient(180deg, #0d1e30 0%, #09131f 100%)', borderBottom: '1px solid #132030' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <Link 
            href="/" 
            style={{
              fontSize: 'clamp(0.875rem, 5vw, 1.375rem)',
              fontWeight: 700,
              color: '#e8f4f8',
              textDecoration: 'none',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#a8d8ea')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#e8f4f8')}
          >
            🇮🇩 JCI Stock Screener
          </Link>
        </div>
      </div>

      {/* Tab Nav */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #132030', padding: 'clamp(12px, 4vw, 28px) 0', background: '#09131f', overflowX: 'auto', scrollbarWidth: 'none' }}>
        <Link
          href="/"
          style={{
            background: 'none',
            border: 'none',
            borderBottom: '2px solid transparent',
            color: '#6b8aad',
            padding: '12px 18px',
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: "'DM Mono', monospace",
            letterSpacing: 1,
            transition: 'color 0.15s',
            whiteSpace: 'nowrap',
            minHeight: 44,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#a8d8ea')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#6b8aad')}
        >
          GOVERNANCE DASHBOARD
        </Link>
        <div
          style={{
            background: 'none',
            borderBottom: '2px solid #457b9d',
            color: '#a8d8ea',
            padding: '12px 18px',
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: "'DM Mono', monospace",
            letterSpacing: 1,
            transition: 'color 0.15s',
            whiteSpace: 'nowrap',
            minHeight: 44,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          AI SCREENER
        </div>
      </div>

      {/* Content Area */}
      <div style={{ padding: 'clamp(12px, 4vw, 20px) clamp(12px, 4vw, 28px)' }}>
        {/* Section Label */}
        <div style={{ fontSize: 9, letterSpacing: 2, color: '#457b9d', fontFamily: "'DM Mono', monospace", marginBottom: 16, textTransform: 'uppercase' }}>
          AI STOCK SCREENER
        </div>

        {/* Description */}
        <p style={{ fontSize: '0.875rem', color: '#a8c8e8', marginBottom: 24, lineHeight: 1.6 }}>
          Institutional-grade analysis for Indonesian stocks powered by composite scoring algorithms.
        </p>

        {/* Filters */}
        <FilterPanel
          sectors={sectors}
          selectedSector={selectedSector}
          onSectorChange={setSelectedSector}
          selectedAiTier={selectedAiTier}
          onAiTierChange={setSelectedAiTier}
          selectedGovTier={selectedGovTier}
          onGovTierChange={setSelectedGovTier}
          minScore={minScore}
          onMinScoreChange={setMinScore}
          maxScore={maxScore}
          onMaxScoreChange={setMaxScore}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Results Container */}
        <div style={{ background: '#09131f', border: '1px solid #132030', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: 16, borderBottom: '1px solid #132030', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: '#457b9d', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase' }}>
              Results · {stocks.length} stocks
            </div>
            {loading && (
              <span style={{ fontSize: '0.75rem', color: '#6b8aad' }}>Loading...</span>
            )}
          </div>

          {error ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#e76f51', fontSize: '0.875rem' }}>
              {error}
            </div>
          ) : (
            <ScreenerTable
              stocks={stocks}
              onSort={handleSort}
              sortBy={sortBy}
              sortOrder={sortOrder}
            />
          )}
        </div>

        {/* Footer Info */}
        <div style={{ marginTop: 24, background: '#09131f', border: '1px solid #1e3a52', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: '#457b9d', fontFamily: "'DM Mono', monospace", marginBottom: 12, textTransform: 'uppercase' }}>
            SCORING METHODOLOGY
          </div>
          <p style={{ fontSize: '0.875rem', color: '#a8c8e8', lineHeight: 1.6 }}>
            Composite score combines: <strong>Fundamental (35%)</strong> · <strong>Technical (30%)</strong> · <strong>Sentiment (20%)</strong> · <strong>Liquidity (15%)</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
