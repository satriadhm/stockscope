"use client";

interface ResultsHeaderProps {
  totalResults: number;
  view: "table" | "cards";
  onViewChange: (view: "table" | "cards") => void;
}

export function ResultsHeader({
  totalResults,
  view,
  onViewChange,
}: ResultsHeaderProps) {
  return (
    <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-5">
      <div>
        <p className="label mb-1">Live Market</p>
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <span className="inline-flex h-2 w-2 rounded-full bg-bull animate-pulse" />
          <span>
            {totalResults.toLocaleString()} stocks matched
          </span>
        </div>
      </div>

      <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-input p-1">
        <button
          onClick={() => onViewChange("table")}
          className={`p-2 rounded-md transition-all ${
            view === "table"
              ? "bg-brand-dim text-brand"
              : "text-text-muted hover:text-text-primary"
          }`}
          title="Table view"
          aria-label="Table view"
        >
          <span className="material-symbols-outlined">list</span>
        </button>
        <button
          onClick={() => onViewChange("cards")}
          className={`p-2 rounded-md transition-all ${
            view === "cards"
              ? "bg-brand-dim text-brand"
              : "text-text-muted hover:text-text-primary"
          }`}
          title="Card view"
          aria-label="Card view"
        >
          <span className="material-symbols-outlined">grid_view</span>
        </button>
      </div>
    </div>
  );
}
