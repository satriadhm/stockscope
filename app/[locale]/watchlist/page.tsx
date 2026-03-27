import type { ReactElement } from "react";

import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { Navbar } from "@/components/layout/Navbar";

export default function WatchlistPage(): ReactElement {
  return (
    <div className="min-h-dvh bg-surface-base text-text-primary">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-20 md:px-6">
        <section className="rounded-2xl border border-border-subtle bg-surface-card p-6 md:p-8">
          <p className="label mb-2">Portfolio workspace</p>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight">Watchlist</h1>
          <p className="text-sm text-text-secondary">
            Build this section next by wiring saved stocks, alerts, and custom notes.
          </p>
        </section>
      </main>
      <BottomTabBar />
    </div>
  );
}
