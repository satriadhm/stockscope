import type { ReactElement } from "react";

import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { Navbar } from "@/components/layout/Navbar";

export default function ProfilePage(): ReactElement {
  return (
    <div className="min-h-dvh bg-surface-base text-text-primary">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-20 md:px-6">
        <section className="rounded-2xl border border-border-subtle bg-surface-card p-6 md:p-8">
          <p className="label mb-2">Account management</p>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight">Profile</h1>
          <p className="text-sm text-text-secondary">
            Configure plan, locale preference, and notification settings from this page.
          </p>
        </section>
      </main>
      <BottomTabBar />
    </div>
  );
}
