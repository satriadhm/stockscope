import type { ReactElement } from "react";

import { Navbar } from "@/components/layout/Navbar";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { Dashboard } from "@/components/features/Dashboard";

export default function Home(): ReactElement {
  return (
    <>
      <Navbar />
      <Dashboard />
      <BottomTabBar />
    </>
  );
}
