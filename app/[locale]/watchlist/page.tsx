import type { ReactElement } from "react";

import { AppShell } from "@/components/features/integration/AppShell";

export default function WatchlistPage(): ReactElement {
  return (
    <AppShell
      title="Watchlist"
      subtitle="User-focused monitoring queue ready to ingest saved symbols and alerts."
    >
      <section className="card">
          <p className="label mb-2">Portfolio workspace</p>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight">Watchlist</h1>
          <p className="section-sub">This surface is now aligned with the new shell and can be connected to saved items next.</p>
        </section>
    </AppShell>
  );
}
