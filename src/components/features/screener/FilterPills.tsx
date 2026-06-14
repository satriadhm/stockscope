"use client";

interface FilterPill {
  id: string;
  label: string;
}

interface FilterPillsProps {
  pills: FilterPill[];
  active: string[];
  onToggle?: (id: string) => void;
  onReset?: () => void;
}

export function FilterPills({
  pills,
  active,
  onToggle,
  onReset,
}: FilterPillsProps): React.ReactElement {
  return (
    <div
      className="
        flex gap-2 overflow-x-auto pb-1
        scrollbar-none -mx-4 px-4
        md:mx-0 md:px-0 md:flex-wrap
      "
    >
      {pills.map((pill) => {
        const isActive = active.includes(pill.id);
        return (
          <button
            key={pill.id}
            onClick={() => onToggle?.(pill.id)}
            aria-pressed={isActive}
            className={`
              shrink-0 px-3 py-1.5
              rounded-full text-xs font-medium
              border transition-all duration-150
              whitespace-nowrap
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
              ${
                isActive
                  ? "bg-brand-dim border-brand/30 text-brand"
                  : "bg-surface-elevated border-border text-text-secondary hover:border-border-strong hover:text-text-primary"
              }
            `}
          >
            {pill.label}
            {isActive && <span className="ml-1.5" aria-hidden="true">✕</span>}
          </button>
        );
      })}

      {/* Reset button shows when any filter active */}
      {active.length > 0 && (
        <button
          onClick={onReset}
          className="
            shrink-0 px-3 py-1.5
            rounded-full text-xs font-medium
            border border-border
            text-text-muted
            hover:text-bear hover:border-bear/30
            hover:bg-bear-bg
            transition-all duration-150
            whitespace-nowrap
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
          "
        >
          Reset
        </button>
      )}
    </div>
  );
}
