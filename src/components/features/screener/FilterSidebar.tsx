"use client";

import { useState } from "react";

import { useTranslations } from "next-intl";

interface FilterOption {
  id: string;
  label: string;
}

interface FilterSidebarProps {
  sectors?: FilterOption[];
  tiers?: FilterOption[];
  onSectorChange?: (sectorId: string) => void;
  onTierChange?: (tierId: string) => void;
  onPeRangeChange?: (min: number, max: number) => void;
  onRoeRangeChange?: (min: number, max: number) => void;
  onMarketCapChange?: (min: number, max: number) => void;
  onResetFilters?: () => void;
  activeSectors?: string[];
  activeTiers?: string[];
  peRange?: [number, number];
  roeRange?: [number, number];
  marketCapRange?: [number, number];
}

export function FilterSidebar({
  sectors = [],
  tiers = [],
  onSectorChange,
  onTierChange,
  onPeRangeChange,
  onRoeRangeChange,
  onMarketCapChange,
  onResetFilters,
  activeSectors = [],
  activeTiers = [],
  peRange = [0, 100],
  roeRange = [0, 100],
  marketCapRange = [0, 1000],
}: FilterSidebarProps): React.ReactElement {
  const t = useTranslations("filterSidebar");

  // Expandable sections
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    sector: true,
    tier: true,
    pe: false,
    roe: false,
    marketCap: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Helper component for checkbox list
  const FilterCheckboxList = ({
    options,
    active,
    onChange,
  }: {
    options: FilterOption[];
    active: string[];
    onChange?: (id: string) => void;
  }) => (
    <div className="space-y-2">
      {options.map((option) => (
        <label key={option.id} className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={active.includes(option.id)}
            onChange={() => onChange?.(option.id)}
            className="
              w-4 h-4 rounded
              bg-surface-input border border-border
              cursor-pointer
              checked:bg-brand checked:border-brand
              transition-colors
            "
          />
          <span className="text-sm text-text-secondary">{option.label}</span>
        </label>
      ))}
    </div>
  );

  // Helper component for range slider
  const RangeInput = ({
    label,
    min,
    max,
    value,
    onChange,
  }: {
    label: string;
    min: number;
    max: number;
    value: [number, number];
    onChange?: (min: number, max: number) => void;
  }) => (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="number"
          min={min}
          max={max}
          value={value[0]}
          onChange={(e) => onChange?.(parseFloat(e.target.value), value[1])}
          placeholder="Min"
          className="
            flex-1 px-3 py-2 text-sm
            bg-surface-input border border-border
            rounded-lg
            text-text-primary placeholder:text-text-muted
            focus:outline-none focus:border-brand
            focus:ring-1 focus:ring-brand-dim
            transition-all
          "
        />
        <input
          type="number"
          min={min}
          max={max}
          value={value[1]}
          onChange={(e) => onChange?.(value[0], parseFloat(e.target.value))}
          placeholder="Max"
          className="
            flex-1 px-3 py-2 text-sm
            bg-surface-input border border-border
            rounded-lg
            text-text-primary placeholder:text-text-muted
            focus:outline-none focus:border-brand
            focus:ring-1 focus:ring-brand-dim
            transition-all
          "
        />
      </div>
    </div>
  );

  return (
    <aside
      className="
        hidden md:flex flex-col gap-1
        w-56 shrink-0
        sticky top-[56px]
        h-[calc(100vh-56px)]
        overflow-y-auto
        bg-surface-base
        pr-4
      "
    >
      {/* Sector Filter */}
      <div className="space-y-2">
        <button
          onClick={() => toggleSection("sector")}
          className="
            w-full flex items-center justify-between
            px-3 py-2 rounded-lg
            text-sm font-semibold text-text-primary
            hover:bg-surface-elevated
            transition-colors
          "
        >
          {t("sector")}
          <span className="text-text-muted text-lg">
            {expandedSections.sector ? "−" : "+"}
          </span>
        </button>
        {expandedSections.sector && (
          <div className="px-3 pb-3">
            <FilterCheckboxList
              options={sectors}
              active={activeSectors}
              onChange={onSectorChange}
            />
          </div>
        )}
      </div>

      {/* Score Tier Filter */}
      <div className="space-y-2">
        <button
          onClick={() => toggleSection("tier")}
          className="
            w-full flex items-center justify-between
            px-3 py-2 rounded-lg
            text-sm font-semibold text-text-primary
            hover:bg-surface-elevated
            transition-colors
          "
        >
          {t("scoreTier")}
          <span className="text-text-muted text-lg">
            {expandedSections.tier ? "−" : "+"}
          </span>
        </button>
        {expandedSections.tier && (
          <div className="px-3 pb-3">
            <FilterCheckboxList
              options={tiers}
              active={activeTiers}
              onChange={onTierChange}
            />
          </div>
        )}
      </div>

      {/* P/E Ratio Range */}
      <div className="space-y-2">
        <button
          onClick={() => toggleSection("pe")}
          className="
            w-full flex items-center justify-between
            px-3 py-2 rounded-lg
            text-sm font-semibold text-text-primary
            hover:bg-surface-elevated
            transition-colors
          "
        >
          {t("pe")}
          <span className="text-text-muted text-lg">
            {expandedSections.pe ? "−" : "+"}
          </span>
        </button>
        {expandedSections.pe && (
          <div className="px-3 pb-3">
            <RangeInput
              label="P/E Ratio"
              min={0}
              max={100}
              value={peRange}
              onChange={onPeRangeChange}
            />
          </div>
        )}
      </div>

      {/* ROE Range */}
      <div className="space-y-2">
        <button
          onClick={() => toggleSection("roe")}
          className="
            w-full flex items-center justify-between
            px-3 py-2 rounded-lg
            text-sm font-semibold text-text-primary
            hover:bg-surface-elevated
            transition-colors
          "
        >
          {t("roe")}
          <span className="text-text-muted text-lg">
            {expandedSections.roe ? "−" : "+"}
          </span>
        </button>
        {expandedSections.roe && (
          <div className="px-3 pb-3">
            <RangeInput
              label="ROE %"
              min={0}
              max={100}
              value={roeRange}
              onChange={onRoeRangeChange}
            />
          </div>
        )}
      </div>

      {/* Market Cap Range */}
      <div className="space-y-2">
        <button
          onClick={() => toggleSection("marketCap")}
          className="
            w-full flex items-center justify-between
            px-3 py-2 rounded-lg
            text-sm font-semibold text-text-primary
            hover:bg-surface-elevated
            transition-colors
          "
        >
          {t("marketCap")}
          <span className="text-text-muted text-lg">
            {expandedSections.marketCap ? "−" : "+"}
          </span>
        </button>
        {expandedSections.marketCap && (
          <div className="px-3 pb-3">
            <RangeInput
              label="Market Cap"
              min={0}
              max={1000}
              value={marketCapRange}
              onChange={onMarketCapChange}
            />
          </div>
        )}
      </div>

      {/* Reset Button - Desktop Only */}
      <button
        onClick={onResetFilters}
        className="
          mt-auto mb-4 w-full py-2 px-3
          rounded-lg border border-border
          text-sm font-medium
          text-text-muted
          hover:text-bear hover:border-bear/30
          hover:bg-bear-bg
          transition-all duration-150
        "
      >
        {t("reset")}
      </button>
    </aside>
  );
}
