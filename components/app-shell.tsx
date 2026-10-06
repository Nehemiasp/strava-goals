"use client";

import type { ReactNode } from "react";
import { DataProvider } from "@/lib/client/data";
import { TabBar } from "./tab-bar";
import { ToastProvider } from "./toast";
import { UiProvider } from "./ui-context";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <DataProvider>
      <ToastProvider>
        <UiProvider>
          <main className="mx-auto min-h-dvh w-full max-w-[560px] px-5" style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}>
            {children}
          </main>
          <TabBar />
        </UiProvider>
      </ToastProvider>
    </DataProvider>
  );
}
