"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

function useDarkMode() {
  const [dark, setDark] = useState<boolean>(false);

  // Hydration-safe: read from localStorage or system preference
  useEffect(() => {
    const stored = localStorage.getItem("dark-mode");
    if (stored !== null) {
      setDark(stored === "true");
    } else {
      setDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("dark-mode", String(dark));
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}

export function AppShell({ children }: { children: ReactNode }) {
  const { dark, toggle } = useDarkMode();

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full">
        <header className="flex items-center gap-4 border-b border-border px-6 py-3">
          <SidebarTrigger className="mr-2" />
          <h1 className="text-lg font-semibold tracking-tight">Label Suite</h1>
          <button
            onClick={toggle}
            className="ml-auto rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </SidebarProvider>
  );
}