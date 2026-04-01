"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";

export function BottomTabBar(): React.ReactElement {
  const t = useTranslations("bottomTabBar");
  const pathname = usePathname();

  // Define tabs
  const tabs = [
    { icon: "🏠", label: t("home"), href: "/", id: "home" },
    { icon: "🔍", label: t("screener"), href: "/screener", id: "screener" },
    {
      icon: "📊",
      label: t("watchlist"),
      href: "/watchlist",
      id: "watchlist",
    },
    { icon: "👤", label: t("profile"), href: "/profile", id: "profile" },
  ];

  const isActive = (href: string): boolean => {
    if (href === "/") {
      return pathname === "/" || pathname === "";
    }
    return pathname?.startsWith(href) ?? false;
  };

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-50
        md:hidden
        bg-surface-card/90 backdrop-blur-md
        border-t border-border-subtle
        pb-safe
      "
    >
      <div
        className="
          flex items-center justify-around
          h-16
        "
      >
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={`
              flex flex-col items-center justify-center
              w-full h-full
              gap-1
              text-center
              transition-all duration-150
              ${
                isActive(tab.href)
                  ? "text-brand"
                  : "text-text-muted hover:text-text-secondary"
              }
            `}
            aria-label={tab.label}
          >
            <span className="text-xl">{tab.icon}</span>
            <span
              className={`
                text-2xs font-medium
                transition-colors
              `}
            >
              {tab.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
