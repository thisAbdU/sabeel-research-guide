"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Menu, X, Compass, MessageSquare, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/Button";

import { useAuth } from "@/context/AuthContext";
import { LogOut, User as UserIcon } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { user, displayName, signOut } = useAuth();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/chat", label: "Companion", icon: MessageSquare },
    { href: "/discover", label: "Discover", icon: Compass },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              ScholarXiv
            </span>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Companion
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800/80 dark:text-zinc-100"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                {link.icon && <link.icon className="h-4 w-4" />}
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side CTA & Auth */}
        <div className="hidden items-center gap-2.5 md:flex">
          {user ? (
            <>
              <div className="flex items-center gap-2 px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  <UserIcon className="h-3.5 w-3.5" />
                </div>
                <span className="font-medium max-w-[120px] truncate" title={displayName}>
                  {displayName}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="text-xs gap-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </Button>
              <Link href="/chat">
                <Button variant="default" size="sm" className="gap-2 rounded-xl">
                  <Sparkles className="h-3.5 w-3.5" />
                  Companion
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="default" size="sm" className="gap-2 rounded-xl">
                  <Sparkles className="h-3.5 w-3.5" />
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-zinc-200 bg-white px-4 pt-2 pb-6 md:hidden dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-base font-medium ${
                  pathname === link.href
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {link.icon && <link.icon className="h-5 w-5" />}
                  {link.label}
                </div>
              </Link>
            ))}
            <div className="pt-4 flex flex-col gap-2">
              {user ? (
                <>
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-xs">
                    <UserIcon className="h-4 w-4 text-zinc-500" />
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                      {displayName}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full justify-center gap-2 text-xs"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full justify-center">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="default" className="w-full justify-center">
                      Create Account
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
