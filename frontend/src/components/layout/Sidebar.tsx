"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  MessageSquare,
  Compass,
  LayoutDashboard,
  Sparkles,
  User,
  Moon,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface SidebarProps {
  onNavigate?: () => void;
  isMobile?: boolean;
}

export function Sidebar({ onNavigate, isMobile = false }: SidebarProps) {
  const pathname = usePathname();

  const mainNav = [
    { href: "/", label: "Home", icon: Home },
    { href: "/chat", label: "Chat Assistant", icon: MessageSquare },
    { href: "/discover", label: "Discover", icon: Compass },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ];

  const recentHistory = [
    {
      id: "h1",
      title: "AI in Higher Education",
      mode: "Vent",
      time: "Just now",
    },
    {
      id: "h2",
      title: "Social Media on Students",
      mode: "Roast",
      time: "Yesterday",
    },
    {
      id: "h3",
      title: "IoT Irrigation Grant Call",
      mode: "Funding",
      time: "2 days ago",
    },
    {
      id: "h4",
      title: "Telehealth Protocol Study",
      mode: "Vent",
      time: "Sep 20",
    },
  ];

  return (
    <aside
      className={`flex flex-col border-r border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950 ${
        isMobile
          ? "h-full w-full"
          : "hidden lg:flex w-64 shrink-0 h-screen sticky top-0"
      }`}
    >
      {/* 1. Sticky Logo Header (Non-scrolling) */}
      <div className="shrink-0 flex items-center justify-between px-4 py-4 border-b border-zinc-100 dark:border-zinc-800">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-50">
              ScholarXiv
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
              Companion
            </div>
          </div>
        </Link>
        <button
          type="button"
          aria-label="Toggle theme"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        >
          <Moon className="h-4 w-4" />
        </button>
      </div>

      {/* 2. Scrollable Middle Area (Navigation + Recent History) */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Main Navigation */}
        <div className="space-y-1">
          <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Navigation
          </div>
          {mainNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950"
                    : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                <item.icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive
                      ? "text-white dark:text-zinc-950"
                      : "text-zinc-400 group-hover:text-zinc-700 dark:text-zinc-500"
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Recent History Section */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            <span>Recent History</span>
            <Clock className="h-3 w-3 text-zinc-400" />
          </div>
          <div className="space-y-0.5">
            {recentHistory.map((session) => (
              <Link
                key={session.id}
                href="/chat"
                onClick={onNavigate}
                className="group flex flex-col rounded-lg px-2.5 py-2 text-xs transition-colors hover:bg-zinc-100/80 dark:hover:bg-zinc-900"
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate group-hover:text-zinc-950 dark:group-hover:text-white">
                    {session.title}
                  </span>
                  <span className="text-[10px] text-zinc-400 shrink-0 font-mono">
                    {session.mode}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400 truncate mt-0.5">
                  {session.time}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Sticky User Profile Footer (Non-scrolling) */}
      <div className="shrink-0 p-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
        <div className="rounded-xl border border-zinc-200/90 bg-white p-2.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 font-semibold text-xs border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700">
                <User className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[85px]">
                  Researcher
                </div>
                <div className="text-[10px] text-zinc-400">
                  Free Account
                </div>
              </div>
            </div>
            <Link href="/login" onClick={onNavigate}>
              <Button variant="outline" size="sm" className="h-7 text-[11px] px-2.5 rounded-lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
