"use client";

import { useEffect, useMemo, useState } from "react";

import { useTranslations } from "next-intl";

import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { Navbar } from "@/components/layout/Navbar";
import { FilterPills } from "@/components/features/screener/FilterPills";
import { FilterSidebar } from "@/components/features/screener/FilterSidebar";
import { ResultsHeader } from "@/components/features/screener/ResultsHeader";
import { ScreenerTable } from "@/components/features/screener/ScreenerTable";
import { StockCard } from "@/components/features/screener/StockCard";
import { StockDetailPanel } from "@/components/features/screener/StockDetailPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchBar } from "@/components/ui/SearchBar";
import { StockCardSkeleton, TableRowSkeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";

import type { EnrichedStock } from "@/types/unified";

const sectors = [
  { id: "finance", label: "Finance" },
  { id: "energy", label: "Energy" },
  { id: "tech", label: "Technology" },
  { id: "consumer", label: "Consumer" },
  { id: "industrial", label: "Industrial" },
  { id: "property", label: "Property" },
  { id: "healthcare", label: "Healthcare" },
  { id: "mining", label: "Mining" },
];

const tiers = [
  { id: "s", label: "Tier S" },
  { id: "a", label: "Tier A" },
  { id: "b", label: "Tier B" },
  { id: "c", label: "Tier C" },
  { id: "d", label: "Tier D" },
];

export function ScreenerWorkspace(): React.ReactElement {
  const t = useTranslations("screenerPage");
  const loadErrorLabel = t("loadError");

  const [stocks, setStocks] = useState<EnrichedStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"table" | "cards">("table");

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

  const [selectedStock, setSelectedStock] = useState<EnrichedStock | null>(
    null,
  );
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const marketData = {
    jciIndex: 7284,
    jciChange: 0.42,
    advancing: 412,
    declining: 318,
    marketCap: "Rp 9.8T",
  };

  useEffect(() => {
    const handleResize = () => {
      setView(window.innerWidth < 1024 ? "cards" : "table");
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();

    if (searchQuery) params.append("search", searchQuery);
    if (selectedSectors.length > 0) {
      params.append("sectors", selectedSectors.join(","));
    }
    if (selectedTiers.length > 0) {
      params.append("tiers", selectedTiers.join(","));
    }
    params.append("peMin", peRange[0].toString());
    params.append("peMax", peRange[1].toString());
    params.append("roeMin", roeRange[0].toString());
    params.append("roeMax", roeRange[1].toString());

    queueMicrotask(() => setLoading(true));

    fetch(`/api/stocks/enriched?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.success) {
          setStocks(data.data);
          setError(null);
        } else {
          setError(data.error || loadErrorLabel);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setError(loadErrorLabel);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [searchQuery, selectedSectors, selectedTiers, peRange, roeRange, loadErrorLabel]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedSectors([]);
    setSelectedTiers([]);
    setPeRange([0, 100]);
    setRoeRange([0, 100]);
    setMarketCapRange([0, 1000]);
  };

  const activePillIds = useMemo(
    () => [
      ...selectedSectors.map((s) => `sector-${s}`),
      ...selectedTiers.map((t) => `tier-${t}`),
    ],
    [selectedSectors, selectedTiers],
  );

  const allFilterPills = useMemo(
    () => [
      ...sectors.map((s) => ({ ...s, id: `sector-${s.id}` })),
      ...tiers.map((t) => ({ ...t, id: `tier-${t.id}` })),
    ],
    [],
  );

  const togglePill = (id: string) => {
    if (id.startsWith("sector-")) {
      const sectorId = id.replace("sector-", "");
      setSelectedSectors((prev) =>
        prev.includes(sectorId)
          ? prev.filter((s) => s !== sectorId)
          : [...prev, sectorId],
      );
      return;
    }

    if (id.startsWith("tier-")) {
      const tierId = id.replace("tier-", "");
      setSelectedTiers((prev) =>
        prev.includes(tierId) ? prev.filter((t) => t !== tierId) : [...prev, tierId],
      );
    }
  };

  const handleStockClick = (stock: EnrichedStock) => {
    setSelectedStock(stock);
    setIsPanelOpen(true);
  };

  const handlePanelClose = () => {
    setIsPanelOpen(false);
    setTimeout(() => setSelectedStock(null), 250);
  };

  return (
    <div className="relative min-h-dvh overflow-x-clip bg-surface-base text-text-primary">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(1200px_500px_at_85%_-10%,rgba(59,130,246,0.22),transparent),radial-gradient(900px_400px_at_10%_25%,rgba(16,185,129,0.12),transparent)]" />

      <Navbar />

      <div className="mx-auto w-full max-w-[1600px] px-4 pb-24 pt-4 md:px-6 md:pb-8 md:pt-6 lg:px-8">
        <section className="mb-5 rounded-2xl border border-border-subtle bg-surface-card/70 p-4 backdrop-blur-sm md:p-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="label mb-1">Indonesia Equity Intelligence</p>
              <h1 className="text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
                Screener Control Center
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Filter governance and valuation signals in one operational workspace.
              </p>
            </div>
            <div className="w-full max-w-xl">
              <SearchBar
                onSearch={setSearchQuery}
                placeholder="Search ticker or company"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              label="JCI Index"
              value={marketData.jciIndex.toLocaleString("id-ID")}
              delta={marketData.jciChange}
              deltaType="positive"
            />
            <StatCard label="Market Cap" value={marketData.marketCap} />
            <StatCard
              label="Advancing"
              value={marketData.advancing}
              deltaType="positive"
            />
            <StatCard
              label="Declining"
              value={marketData.declining}
              deltaType="negative"
            />
          </div>
        </section>

        <section className="grid items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-border-subtle bg-surface-card/50 p-3 backdrop-blur-sm">
            <FilterSidebar
              sectors={sectors}
              tiers={tiers}
              onSectorChange={(id) => {
                setSelectedSectors((prev) =>
                  prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
                );
              }}
              onTierChange={(id) => {
                setSelectedTiers((prev) =>
                  prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
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
          </aside>

          <main className="rounded-2xl border border-border-subtle bg-surface-card p-3 md:p-5">
            <div className="mb-3">
              <FilterPills
                pills={allFilterPills}
                active={activePillIds}
                onToggle={togglePill}
                onReset={handleResetFilters}
              />
            </div>

            <div className="mb-3 rounded-xl border border-border-subtle bg-surface-elevated/40">
              <ResultsHeader
                view={view}
                onViewChange={setView}
                totalResults={stocks.length}
              />
            </div>

            {error && <EmptyState type="error" onAction={handleResetFilters} />}

            {loading && view === "cards" && (
              <div className="space-y-2 lg:hidden">
                {Array.from({ length: 7 }).map((_, i) => (
                  <StockCardSkeleton key={i} />
                ))}
              </div>
            )}

            {loading && view === "table" && (
              <div className="hidden lg:block">
                <table className="w-full">
                  <tbody>
                    {Array.from({ length: 7 }).map((_, i) => (
                      <TableRowSkeleton key={i} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && !error && searchQuery && stocks.length === 0 && (
              <EmptyState
                type="search"
                query={searchQuery}
                onAction={() => setSearchQuery("")}
              />
            )}

            {!loading && !error && activePillIds.length > 0 && stocks.length === 0 && (
              <EmptyState type="filter" onAction={handleResetFilters} />
            )}

            {!loading && !error && stocks.length > 0 && view === "cards" && (
              <div className="space-y-2 lg:hidden">
                {stocks.map((stock) => (
                  <StockCard
                    key={stock.code}
                    stock={stock}
                    onClick={() => handleStockClick(stock)}
                  />
                ))}
              </div>
            )}

            {!loading && !error && stocks.length > 0 && view === "table" && (
              <div className="hidden lg:block">
                <ScreenerTable
                  stocks={stocks}
                  onSort={(field) => {
                    if (sortBy === field) {
                      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
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
        </section>
      </div>

      <StockDetailPanel
        stock={selectedStock}
        isOpen={isPanelOpen}
        onClose={handlePanelClose}
      />

      <BottomTabBar />
    </div>
  );
}
