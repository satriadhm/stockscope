import type { ReactElement } from "react";

import { AppShell } from "@/components/features/integration/AppShell";

export default function ProfilePage(): ReactElement {
  return (
    <AppShell
      title="Profile"
      subtitle="Plan, identity, and preferences backed by the existing auth session."
    >
      <section className="card">
          <p className="label mb-2">Account management</p>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight">Profile</h1>
          <p className="section-sub">Configure plan, locale preference, and notification settings from this page.</p>
        </section>
    </AppShell>
  );
}
