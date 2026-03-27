"use client";

import { useState } from "react";

import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";

import { AuthButton } from "./AuthButton";

export function Navbar(): React.ReactElement {
  const locale = useLocale();
  const t = useTranslations("navbar");
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Navigation items
  const navItems = [
    { label: t("home"), href: "/" },
    { label: t("screener"), href: "/screener" },
    { label: t("watchlist"), href: "/watchlist" },
  ];

  const isActive = (href: string): boolean => {
    if (href === "/") {
      return pathname === "/" || pathname === "";
    }
    return pathname?.startsWith(href) ?? false;
  };

  return (
    <>
      {/* Main Navbar */}
      <header
        className="
          sticky top-0 z-50 h-14
          bg-surface-card/80 backdrop-blur-md
          border-b border-border-subtle
        "
      >
        <div
          className="
            max-w-7xl mx-auto px-4
            h-full flex items-center
            justify-between gap-4
          "
        >
          {/* Logo */}
          <Link
            href="/"
            className="
              ticker text-base text-text-primary
              tracking-[0.15em] shrink-0
              hover:text-brand transition-colors
            "
          >
            JKSE
            <span className="text-brand ml-1">SCREEN</span>
          </Link>

          {/* Desktop nav */}
          <nav
            className="
              hidden md:flex
              items-center gap-1
            "
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  px-4 py-2 rounded-lg
                  text-sm font-medium
                  transition-colors duration-150
                  ${
                    isActive(item.href)
                      ? "text-brand bg-brand-dim"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
                  }
                `}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Live indicator */}
            <div
              className="
                hidden sm:flex
                items-center gap-1.5
                text-xs text-text-secondary
              "
            >
              <span
                className="
                  w-1.5 h-1.5 rounded-full
                  bg-bull animate-pulse
                "
              />
              <span className="num">LIVE</span>
            </div>

            {/* Sign in */}
            <AuthButton />

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="
                md:hidden
                p-2 rounded-lg
                hover:bg-surface-elevated
                transition-colors
                text-text-primary
              "
              aria-label={t("toggleMenu")}
            >
              <span className="text-lg">☰</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <>
          {/* Overlay */}
          <div
            className="
              fixed inset-0 top-14 z-40
              bg-black/50 md:hidden
            "
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer */}
          <nav
            className="
              fixed top-14 right-0 bottom-0 z-40
              w-64 bg-surface-card
              border-l border-border-subtle
              md:hidden
              animate-slide-in-right
            "
          >
            <div className="flex flex-col gap-1 p-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    px-4 py-3 rounded-lg
                    text-sm font-medium
                    transition-colors duration-150
                    ${
                      isActive(item.href)
                        ? "text-brand bg-brand-dim"
                        : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
                    }
                  `}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </>
      )}
    </>
  );
}
