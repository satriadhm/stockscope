"use client";

import { useEffect, useRef, useState } from "react";

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  core?: boolean; // Core columns are always shown
}

interface ColumnVisibilityMenuProps {
  columns: ColumnConfig[];
  onChange: (columns: ColumnConfig[]) => void;
}

export function ColumnVisibilityMenu({
  columns,
  onChange,
}: ColumnVisibilityMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen]);

  const handleToggle = (columnId: string) => {
    const updated = columns.map((col) =>
      col.id === columnId && !col.core
        ? { ...col, visible: !col.visible }
        : col,
    );
    onChange(updated);
  };

  const handleShowAll = () => {
    const updated = columns.map((col) => ({ ...col, visible: true }));
    onChange(updated);
  };

  const handleShowCore = () => {
    const updated = columns.map((col) => ({ ...col, visible: !!col.core }));
    onChange(updated);
  };

  const visibleCount = columns.filter((c) => c.visible).length;

  return (
    <div ref={menuRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Customize visible columns"
        title="Customize visible columns"
        className="flex items-center gap-1.5 rounded-md border border-border bg-surface-base px-3 py-2 text-sm text-text-primary transition-all hover:bg-surface-elevated hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className="text-base" aria-hidden="true">⚙️</span>
        <span className="font-label text-xs">
          {visibleCount}/{columns.length}
        </span>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+4px)] z-50 min-w-[220px] rounded-lg border border-border bg-surface-card p-3 shadow-lg"
        >
          <div className="mb-2 border-b border-border pb-2 font-label text-[9px] font-semibold uppercase tracking-widest text-text-muted">
            Column visibility
          </div>

          <div className="mb-3 flex flex-col gap-1.5">
            {columns.map((col) => (
              <label
                key={col.id}
                className={`flex items-center gap-2 rounded px-1.5 py-1 transition-colors ${
                  col.core
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer hover:bg-surface-elevated"
                }`}
              >
                <input
                  type="checkbox"
                  checked={col.visible}
                  disabled={col.core}
                  onChange={() => handleToggle(col.id)}
                  className="h-4 w-4 accent-primary disabled:cursor-not-allowed"
                />
                <span
                  className={`text-[0.8125rem] ${
                    col.visible
                      ? "font-medium text-text-primary"
                      : "text-text-secondary"
                  }`}
                >
                  {col.label}
                  {col.core && (
                    <span className="ml-1.5 text-[0.625rem] uppercase tracking-wide text-text-muted">
                      (core)
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>

          <div className="flex gap-1.5 border-t border-border pt-2">
            <button
              type="button"
              onClick={handleShowCore}
              className="flex-1 rounded border border-border bg-surface-base px-2 py-1.5 text-xs font-medium text-text-primary transition-all hover:bg-surface-elevated hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Core only
            </button>
            <button
              type="button"
              onClick={handleShowAll}
              className="flex-1 rounded border border-border bg-surface-base px-2 py-1.5 text-xs font-medium text-text-primary transition-all hover:bg-surface-elevated hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Show all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
