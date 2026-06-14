"use client";

interface ViewToggleProps {
  view: "table" | "cards";
  onChange: (view: "table" | "cards") => void;
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  const buttonClass = (isActive: boolean) =>
    `flex items-center gap-1.5 px-3 py-2 text-sm border border-border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
      isActive
        ? "bg-surface-elevated text-text-primary font-semibold"
        : "bg-surface-base text-text-secondary font-normal hover:bg-surface-card hover:text-text-primary"
    }`;

  return (
    <div className="flex rounded-md overflow-hidden border border-border">
      <button
        type="button"
        onClick={() => onChange("table")}
        aria-pressed={view === "table"}
        aria-label="Table view"
        className={`${buttonClass(view === "table")} border-r-0 rounded-l-md`}
      >
        <span className="text-base" aria-hidden="true">☰</span>
        <span className="font-label text-xs">Table</span>
      </button>
      <button
        type="button"
        onClick={() => onChange("cards")}
        aria-pressed={view === "cards"}
        aria-label="Card view"
        className={`${buttonClass(view === "cards")} border-l-0 rounded-r-md`}
      >
        <span className="text-base" aria-hidden="true">▦</span>
        <span className="font-label text-xs">Cards</span>
      </button>
    </div>
  );
}
