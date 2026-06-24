"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full">
        <header className="flex items-center gap-4 border-b border-neutral-200 px-6 py-3">
          <SidebarTrigger className="mr-2" />
          <h1 className="text-lg font-semibold tracking-tight">Label Suite</h1>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </SidebarProvider>
  );
}
