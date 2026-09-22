"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Day 1 shell: auth backend comes in Day 2+
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fcfcfd] px-4 py-12 dark:bg-zinc-950 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-md dark:bg-zinc-100 dark:text-zinc-950">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            ScholarXiv Companion
          </span>
        </Link>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Sign in to access your research sessions, drafts, and support settings.
        </p>
      </div>

      {/* Auth Card Shell */}
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription className="text-xs">
            Enter your credentials to manage your research companion
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Academic or Personal Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="researcher@university.edu"
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Password
                </label>
                <a href="#" className="text-xs text-zinc-500 hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full mt-2 gap-2 rounded-xl">
              <span>Sign In</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col items-center justify-center border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-500">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-zinc-900 hover:underline dark:text-zinc-100">
              Create one
            </Link>
          </p>
          <Link href="/" className="mt-3 text-[11px] text-zinc-400 hover:text-zinc-600">
            ← Back to Home
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
