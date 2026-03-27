"use client";

import { useEffect, useState } from "react";

import { useLocale, useTranslations } from "next-intl";

import { Navbar } from "@/components/layout/Navbar";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { SearchBar } from "@/components/ui/SearchBar";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  StockCardSkeleton,
  TableRowSkeleton,
} from "@/components/ui/Skeleton";
import { FilterSidebar } from "@/components/features/screener/FilterSidebar";
import { FilterPills } from "@/components/features/screener/FilterPills";
import { StockCard } from "@/components/features/screener/StockCard";
import { ResultsHeader } from "@/components/features/screener/ResultsHeader";
import { ScreenerTable } from "@/components/features/screener/ScreenerTable";
import { StockDetailPanel } from "@/components/features/screener/StockDetailPanel";

import type { EnrichedStock } from "@/types/unified";

export default function ScreenerPage(): React.ReactElement {
  const t = useTranslations("screenerPage");
  const filterT = useTranslations("filterSidebar");
  const locale = useLocale();
  const loadErrorLabel = t("loadError");

  // State management
  const [stocks, setStocks] = useState<EnrichedStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"table" | "cards">("table");

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  const [peRange, setPeRange] = useState<[number, number]>([0, 100]);
  const [roeRange, setRoeRange] = useState<[number, number]>([0, 100]);
  const [marketCapRange, setMarketCapRange] = useState<[number, number]>([
    0, 1000,
  ]);
  const [sortBy, setSortBy] = useState("composite");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Stock detail panel state
  const [selectedStock, setSelectedStock] = useState<EnrichedStock | null>(
    null,
  );
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Market summary state
  const [marketData, setMarketData] = useState({
    jciIndex: 7284,
    jciChange: 0.42,
    advancing: 412,
    declining: 318,
    marketCap: "Rp 9.8T",
  });

  // Auto-switch to cards on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setView("cards");
      } else {
        setView("table");
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch sectors for filter sidebar
  const [sectors, setSectors] = useState<{ id: string; label: string }[]>([
    { id: "finance", label: "Finance" },
    { id: "energy", label: "Energy" },
    { id: "tech", label: "Technology" },
    { id: "consumer", label: "Consumer" },
    { id: "industrial", label: "Industrial" },
    { id: "property", label: "Property" },
    { id: "healthcare", label: "Healthcare" },
    { id: "mining", label: "Mining" },
  ]);

  const tiers = [
    { id: "s", label: "Tier S" },
    { id: "a", label: "Tier A" },
    { id: "b", label: "Tier B" },
    { id: "c", label: "Tier C" },
    { id: "d", label: "Tier D" },
  ];

  // Fetch stocks when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.append("search", searchQuery);
    if (selectedSectors.length > 0)
      params.append("sectors", selectedSectors.join(","));
    if (selectedTiers.length > 0) params.append("tiers", selectedTiers.join(","));
    params.append("peMin", peRange[0].toString());
    params.append("peMax", peRange[1].toString());
    params.append("roeMin", roeRange[0].toString());
    params.append("roeMax", roeRange[1].toString());

    queueMicrotask(() => setLoading(true));
    fetch(`/api/stocks/enriched?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStocks(data.data);
          setError(null);
        } else {
          setError(data.error || loadErrorLabel);
        }
      })
      .catch(() => {
        setError(loadErrorLabel);
      })
      .finally(() => setLoading(false));
  }, [
    searchQuery,
    selectedSectors,
    selectedTiers,
    peRange,
    roeRange,
    loadErrorLabel,
  ]);

  const handleStockClick = (stock: EnrichedStock) => {
    setSelectedStock(stock);
    setIsPanelOpen(true);
  };

  const handlePanelClose = () => {
    setIsPanelOpen(false);
    setTimeout(() => setSelectedStock(null), 300);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedSectors([]);
    setSelectedTiers([]);
    setPeRange([0, 100]);
    setRoeRange([0, 100]);
    setMarketCapRange([0, 1000]);
  };

  // Convert selected filters to pills
  const activePillIds = [
    ...selectedSectors.map((s) => `sector-${s}`),
    ...selectedTiers.map((t) => `tier-${t}`),
  ];

  const allFilterPills = [
    ...sectors.map((s) => ({ ...s, id: `sector-${s.id}` })),
    ...tiers.map((t) => ({ ...t, id: `tier-${t.id}` })),
  ];

  const togglePill = (id: string) => {
    if (id.startsWith("sector-")) {
      const sectorId = id.replace("sector-", "");
      setSelectedSectors((prev) =>
        prev.includes(sectorId)
          ? prev.filter((s) => s !== sectorId)
          : [...prev, sectorId],
      );
    } else if (id.startsWith("tier-")) {
      const tierId = id.replace("tier-", "");
      setSelectedTiers((prev) =>
        prev.includes(tierId)
          ? prev.filter((t) => t !== tierId)
          : [...prev, tierId],
      );
    }
  };

  return (
    <div className="min-h-screen bg-surface-base flex flex-col">
      {/* Navbar */}
      <Navbar />

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden pt-14 pb-20 md:pb-0">
        {/* Desktop Filter Sidebar */}
        <FilterSidebar
          sectors={sectors}
          tiers={tiers}
          onSectorChange={(id) => {
            setSelectedSectors((prev) =>
              prev.includes(id)
                ? prev.filter((s) => s !== id)
                : [...prev, id],
            );
          }}
          onTierChange={(id) => {
            setSelectedTiers((prev) =>
              prev.includes(id)
                ? prev.filter((t) => t !== id)
                : [...prev, id],
            );
          }}
          onPeRangeChange={(min, max) => setPeRange([min, max])}
          onRoeRangeChange={(min, max) => setRoeRange([min, max])}
          onMarketCapChange={(min, max) => setMarketCapRange([min, max])}
          onResetFilters={handleResetFilters}
          activeSectors={selectedSectors}
          activeTiers={selectedTiers}
          peRange={peRange}
          roeRange={roeRange}
          marketCapRange={marketCapRange}
        />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 px-4 md:px-6 py-4 overflow-y-auto">
          {/* Market Summary KPI Cards - 2 col mobile, 4 col desktop */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <StatCard
              label="JCI Index"
              value={marketData.jciIndex.toLocaleString("id-ID")}
              delta={marketData.jciChange}
              deltaType="positive"
            />
            <StatCard
              label="Market Cap"
              value={marketData.marketCap}
              icon="📊"
            />
            <StatCard
              label="Advancing"
              value={marketData.advancing}
              deltaType="positive"
              icon="📈"
            />
            <StatCard
              label="Declining"
              value={marketData.declining}
              deltaType="negative"
              icon="📉"
            />
          </div>

          {/* Search Bar */}
          <div className="mb-3">
            <SearchBar
              onSearch={setSearchQuery}
              placeholder="Search ticker or company..."
            />
          </div>

          {/* Filter Pills - Visible on both mobile and desktop */}
          <div className="mb-3">
            <FilterPills
              pills={allFilterPills}
              active={activePillIds}
              onToggle={togglePill}
              onReset={handleResetFilters}
            />
          </div>

          {/* Results Count + Sort */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-text-muted">
              <span className="text-text-secondary font-medium">
                {stocks.length}
              </span>{" "}
              companies
            </span>
            <ResultsHeader
              view={view}
              onViewChange={setView}
              totalResults={stocks.length}
            />
          </div>

          {/* Error State */}
          {error && (
            <EmptyState
              type="error"
              onAction={handleResetFilters}
            />
          )}

          {/* Loading State - Mobile Card List */}
          {loading && view === "cards" && (
            <div className="md:hidden space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <StockCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Loading State - Desktop Table */}
          {loading && view === "table" && (
            <div className="hidden md:block">
              <table className="w-full">
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRowSkeleton key={i} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State - Search */}
          {!loading && !error && searchQuery && stocks.length === 0 && (
            <EmptyState
              type="search"
              query={searchQuery}
              onAction={() => setSearchQuery("")}
            />
          )}

          {/* Empty State - Filters */}
          {!loading && !error && activePillIds.length > 0 && stocks.length === 0 && (
            <EmptyState
              type="filter"
              onAction={handleResetFilters}
            />
          )}

          {/* Stock List - Cards on mobile */}
          {!loading && !error && stocks.length > 0 && view === "cards" && (
            <div className="md:hidden space-y-2">
              {stocks.map((stock) => (
                <StockCard
                  key={stock.code}
                  stock={stock}
                  onClick={() => handleStockClick(stock)}
                />
              ))}
            </div>
          )}

          {/* Stock List - Table on desktop */}
          {!loading && !error && stocks.length > 0 && view === "table" && (
            <div className="hidden md:block">
              <ScreenerTable
                stocks={stocks}
                onSort={(field) => {
                  if (sortBy === field) {
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  } else {
                    setSortBy(field);
                    setSortOrder("desc");
                  }
                }}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onStockClick={handleStockClick}
              />
            </div>
          )}
        </main>
      </div>

      {/* Stock Detail Panel - Slides in from right */}
      <StockDetailPanel
        stock={selectedStock}
        isOpen={isPanelOpen}
        onClose={handlePanelClose}
      />

      {/* Mobile Bottom Tab Bar */}
      <BottomTabBar />
    </div>
  );
}
