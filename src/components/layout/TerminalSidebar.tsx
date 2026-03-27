"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

interface TerminalSidebarProps {
  locale: string;
}

export function TerminalSidebar({ locale }: TerminalSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isActive = (path: string) => pathname.includes(path);

  return (
    <aside
      className={`hidden md:flex flex-col h-[calc(100vh-68px)] transition-all duration-300
                      bg-[--bg-surface] border-r border-[#132030] font-mono text-sm 
                      tracking-wide sticky top-[68px] ${isCollapsed ? "w-20" : "w-64"}`}
    >
      {/* Brand Section & Toggle */}
      <div className="p-6 flex items-center justify-between">
        {!isCollapsed && (
          <div>
            <div className="text-[--color-primary] font-black text-xs uppercase tracking-widest mb-1">
              Stockscope
            </div>
            <div className="text-[--text-secondary] text-[10px] opacity-60">
              Terminal v1.0
            </div>
          </div>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-[--text-secondary] hover:text-[--text-primary] focus-visible:ring-2 focus-visible:ring-[--color-primary] rounded p-1"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="material-symbols-outlined">{isCollapsed ? "menu_open" : "menu"}</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2">
        <a
          href={`/${locale}`}
          title="Dashboard"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg focus-visible:ring-2 focus-visible:ring-[--color-primary]
                     transition-all duration-200
                     ${
                       isActive("/") && !isActive("/screener")
                         ? "bg-[--color-primary]/10 text-[--color-primary]"
                         : "text-[--text-secondary] hover:bg-white/5 hover:text-[--text-primary]"
                     } ${isCollapsed ? "justify-center px-0" : ""}`}
        >
          <span className="material-symbols-outlined">dashboard</span>
          {!isCollapsed && <span>Dashboard</span>}
        </a>

        <a
          href={`/${locale}/screener`}
          title="Screener"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg focus-visible:ring-2 focus-visible:ring-[--color-primary]
                     transition-all duration-200
                     ${
                       isActive("/screener")
                         ? "bg-[--color-primary]/10 text-[--color-primary]"
                         : "text-[--text-secondary] hover:bg-white/5 hover:text-[--text-primary]"
                     } ${isCollapsed ? "justify-center px-0" : ""}`}
        >
          <span className="material-symbols-outlined">filter_alt</span>
          {!isCollapsed && <span>Screener</span>}
        </a>

        <a
          href="#"
          title="Watchlist"
          className={`flex items-center gap-3 text-[--text-secondary] px-4 py-3 focus-visible:ring-2 focus-visible:ring-[--color-primary]
                     hover:bg-white/5 hover:text-[--text-primary] transition-all duration-200 
                     rounded-lg ${isCollapsed ? "justify-center px-0" : ""}`}
        >
          <span className="material-symbols-outlined">visibility</span>
          {!isCollapsed && <span>Watchlist</span>}
        </a>
      </nav>

      {/* Footer Info */}
      {!isCollapsed && (
        <div className="p-4 border-t border-[#132030]">
          <p className="text-[10px] text-[--text-secondary] text-center">
            Live Market Data
          </p>
        </div>
      )}
    </aside>
  );
}
