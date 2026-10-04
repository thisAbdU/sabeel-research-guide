"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  SquarePen,
  Compass,
  LayoutDashboard,
  Sparkles,
  User,
  Clock,
  LogOut,
  Loader2,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import type { ChatMode, ConversationMeta } from "@/types/chat";

interface SidebarProps {
  onNavigate?: () => void;
  isMobile?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

function getInitials(name: string): string {
  const clean = name.trim();
  if (!clean) return "SI";
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function modeLabel(mode: ChatMode): string {
  if (mode === "funding") return "Funding";
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

export function Sidebar({
  onNavigate,
  isMobile = false,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, displayName, signOut } = useAuth();
  const {
    conversations,
    activeId,
    isLoadingList,
    listHasMore,
    loadMoreConversations,
    startNewChat,
  } = useChat();

  const mainNav = [
    { href: "/chat", label: "New Chat", icon: SquarePen },
    { href: "/discover", label: "Discover", icon: Compass },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      onNavigate?.();
      router.replace("/login");
    }
  };

  const handleOpen = (session: ConversationMeta) => {
    onNavigate?.();
    const href = `/chat?c=${session.id}`;
    if (pathname !== "/chat") {
      router.push(href);
      return;
    }
    router.replace(href, { scroll: false });
  };

  // Collapsed Rail (ChatGPT style): Only show icons on desktop
  if (isCollapsed && !isMobile) {
    return (
      <aside className="hidden lg:flex flex-col border-r border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950 w-16 shrink-0 h-screen sticky top-0 transition-all duration-200 justify-between items-center py-3.5">
        {/* Top: ScholarXiv Companion icon which on hover reveals open collapse button */}
        <div className="shrink-0 flex items-center justify-center">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="group relative flex h-10 w-10 items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Open sidebar"
            aria-label="Open sidebar"
          >
            {/* ScholarXiv Companion logo (visible by default, hidden on hover) */}
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950 transition-all duration-150 group-hover:opacity-0 group-hover:scale-75">
              <Sparkles className="h-4 w-4" />
            </div>
            {/* Open sidebar icon (hidden by default, revealed on hover) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150 text-zinc-700 dark:text-zinc-200">
              <PanelLeft className="h-5 w-5" />
            </div>
          </button>
        </div>

        {/* Middle: Navigation Icons */}
        <div className="flex-1 overflow-y-auto py-6 flex flex-col items-center space-y-3">
          {mainNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => {
                  if (item.href === "/chat") {
                    startNewChat();
                  }
                }}
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors cursor-pointer ${
                  isActive
                    ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                }`}
                title={item.label}
                aria-label={item.label}
              >
                <item.icon className="h-5 w-5" />
              </Link>
            );
          })}
        </div>

        {/* Bottom: ThemeToggle & User Profile Circle */}
        <div className="shrink-0 flex flex-col items-center gap-3">
          <ThemeToggle />
          {user ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="group relative flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200 text-zinc-700 font-semibold text-xs border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 hover:border-red-400 dark:hover:border-red-500 transition-colors cursor-pointer"
              title={`Signed in as ${displayName || user.email}. Click to sign out.`}
              aria-label="User profile / Sign out"
            >
              <span className="group-hover:opacity-0 transition-opacity">
                {getInitials(displayName || user.email || "SI")}
              </span>
              <LogOut className="h-4 w-4 text-red-600 dark:text-red-400 absolute opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ) : (
            <Link
              href="/login"
              onClick={onNavigate}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-700 transition-colors"
              title="Sign In"
              aria-label="Sign In"
            >
              <User className="h-4 w-4" />
            </Link>
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`flex flex-col border-r border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950 transition-all duration-200 ${
        isMobile
          ? "h-full w-full"
          : isCollapsed
            ? "hidden"
            : "hidden lg:flex w-64 shrink-0 h-screen sticky top-0"
      }`}
    >
      <div className="shrink-0 flex items-center justify-between px-4 py-4 border-b border-zinc-100 dark:border-zinc-800">
        <Link
          href="/"
          onClick={() => onNavigate?.()}
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90 min-w-0"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 truncate">
            <div className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
              ScholarXiv
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
              Companion
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          <ThemeToggle />
          {!isMobile && onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div className="space-y-1">
          <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Navigation
          </div>
          {mainNav.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => {
                  onNavigate?.();
                  if (item.href === "/chat") {
                    startNewChat();
                  }
                }}
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

        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            <span>Recent History</span>
            <Clock className="h-3 w-3 text-zinc-400" />
          </div>
          <div className="space-y-0.5">
            {!user ? (
              <p className="px-2.5 py-2 text-[11px] text-zinc-400">
                Sign in to see your chats.
              </p>
            ) : isLoadingList && conversations.length === 0 ? (
              <div className="flex items-center gap-2 px-2.5 py-3 text-zinc-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="text-[11px]">Loading…</span>
              </div>
            ) : conversations.length === 0 ? (
              <p className="px-2.5 py-2 text-[11px] text-zinc-400">
                No conversations yet.
              </p>
            ) : (
              conversations.map((session) => {
                const isActive = activeId === session.id && pathname === "/chat";
                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => handleOpen(session)}
                    className={`group w-full flex flex-col rounded-lg px-2.5 py-2 text-xs text-left transition-colors ${
                      isActive
                        ? "bg-zinc-100 dark:bg-zinc-800"
                        : "hover:bg-zinc-100/80 dark:hover:bg-zinc-900"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate group-hover:text-zinc-950 dark:group-hover:text-white">
                        {session.title || "Untitled chat"}
                      </span>
                      <span className="text-[10px] text-zinc-400 shrink-0 font-mono">
                        {modeLabel(session.mode)}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 truncate mt-0.5">
                      {relativeTime(session.updatedAt)}
                    </span>
                  </button>
                );
              })
            )}
            {user && listHasMore && (
              <button
                type="button"
                onClick={() => {
                  void loadMoreConversations();
                }}
                disabled={isLoadingList}
                className="w-full px-2.5 py-2 text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-50"
              >
                {isLoadingList ? "Loading…" : "Load more"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 p-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
        <div className="rounded-xl border border-zinc-200/90 bg-white p-2.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 font-semibold text-xs border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div
                  className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate"
                  title={user ? displayName : "Guest"}
                >
                  {user ? displayName : "Guest"}
                </div>
                <div
                  className="text-[10px] text-zinc-400 truncate"
                  title={user?.email || "Not signed in"}
                >
                  {user ? (user.email ?? "Researcher") : "Not signed in"}
                </div>
              </div>
            </div>
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                title="Sign Out"
                className="h-9 w-9 p-0 shrink-0 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:text-zinc-400 dark:hover:text-red-400 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            ) : (
              <Link href="/login" onClick={onNavigate} className="shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-[11px] px-2.5 rounded-lg"
                >
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
