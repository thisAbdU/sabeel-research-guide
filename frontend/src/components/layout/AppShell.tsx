"use client";

import * as React from "react";
import Link from "next/link";
import { Sidebar } from "./Sidebar";
import { Menu, Sparkles, X } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#fcfcfd] dark:bg-zinc-950">
      {/* 1. Desktop Sticky Sidebar (No top navbar on app pages) */}
      <Sidebar />

      {/* 2. Main Content Canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile-only header (Desktop uses the sticky sidebar directly) */}
        <header className="lg:hidden shrink-0 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/90 px-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              ScholarXiv Companion
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Toggle menu"
          >
            {mobileDrawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {/* Mobile Drawer Overlay */}
        {mobileDrawerOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <div className="relative z-50 flex w-72 flex-col bg-white dark:bg-zinc-900 shadow-xl">
              <Sidebar onNavigate={() => setMobileDrawerOpen(false)} isMobile />
            </div>
          </div>
        )}

        {/* Scrollable Main Workspace */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
