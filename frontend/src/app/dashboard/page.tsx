"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Coffee,
  Coins,
  Globe,
  Lock,
  Sparkles,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, displayName } = useAuth();
  const [activeTab, setActiveTab] = React.useState<"research" | "support" | "funding">("research");

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  if (authLoading) {
    return (
      <AppShell>
        <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center p-4">
          <Card className="max-w-md p-6 text-center shadow-lg">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 mb-4">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">
              Authentication Required
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Sign in to access your researcher dashboard, drafts, and support settings.
            </p>
            <div className="mt-5 flex gap-2 justify-center">
              <Link href="/login">
                <Button size="sm" className="rounded-xl gap-1.5">
                  <span>Sign In to Continue</span>
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  const stats = [
    { title: "Published Works", value: "2", icon: Globe, desc: "Live on Discover" },
    { title: "Draft Ideas", value: "3", icon: FileText, desc: "Private to you" },
    { title: "Funding Matches", value: "8", icon: Coins, desc: "Found via Companion" },
    { title: "Tips Received", value: "350 ETB", icon: Coffee, desc: "Via Links.et support" },
  ];

  const mockMyResearch = [
    {
      id: "1",
      title: "AI Adoption Factors Among University Students in Addis Ababa",
      field: "Artificial Intelligence",
      status: "published",
      supportEnabled: true,
      updatedAt: "2 days ago",
    },
    {
      id: "2",
      title: "Comparative Analysis of Crop Disease Detection with Edge Vision",
      field: "Agricultural Computing",
      status: "draft",
      supportEnabled: false,
      updatedAt: "1 week ago",
    },
  ];

  return (
    <AppShell>
      <div className="space-y-8 pb-12">
        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 pb-6 dark:border-zinc-800">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl dark:text-zinc-50">
              Researcher Dashboard
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Manage your private research drafts, public Discover submissions, and Links.et support settings.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/chat">
              <Button size="sm" className="gap-2 rounded-lg">
                <Sparkles className="h-4 w-4" />
                New AI Research Session
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {stat.title}
                </span>
                <stat.icon className="h-4 w-4 text-zinc-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {stat.value}
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                {stat.desc}
              </p>
            </Card>
          ))}
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <button
            onClick={() => setActiveTab("research")}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "research"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            My Research & Drafts
          </button>
          <button
            onClick={() => setActiveTab("support")}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "support"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            Support & Tips Settings
          </button>
          <button
            onClick={() => setActiveTab("funding")}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "funding"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            Saved Funder Matches
          </button>
        </div>

        {/* Tab Content Shell */}
        {activeTab === "research" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                Research Projects
              </h2>
              <span className="text-xs text-zinc-400">
                Research is private by default until intentionally published.
              </span>
            </div>

            <div className="space-y-3">
              {mockMyResearch.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                        {item.title}
                      </span>
                      {item.status === "published" ? (
                        <span className="text-[11px] font-medium text-zinc-700 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 px-2 py-0.5 rounded">
                          Public
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 px-2 py-0.5 rounded flex items-center">
                          <Lock className="h-2.5 w-2.5 mr-1" />
                          Draft
                        </span>
                      )}
                      {item.supportEnabled && (
                        <span className="text-[11px] font-medium text-zinc-700 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 px-2 py-0.5 rounded flex items-center">
                          <Coffee className="h-2.5 w-2.5 mr-1" />
                          Tips Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span>{item.field}</span>
                      <span>·</span>
                      <span>Updated {item.updatedAt}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="text-xs rounded-lg">
                      Edit Details
                    </Button>
                    {item.status === "published" ? (
                      <Button variant="ghost" size="sm" className="text-xs text-red-600 dark:text-red-400 rounded-lg">
                        Unpublish
                      </Button>
                    ) : (
                      <Button variant="default" size="sm" className="text-xs rounded-lg">
                        Publish to Discover
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "support" && (
          <Card className="p-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Links.et Tip Configuration
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Configure your verified payment method to receive reader appreciation contributions. (Sensitive credentials are handled securely via Links.et).
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200/80 bg-zinc-50 p-4 text-xs dark:border-zinc-800 dark:bg-zinc-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    Payment Gateway Status:
                  </span>
                  <p className="text-zinc-500">Links.et Telebirr / CBE / Local Bank</p>
                </div>
                <span className="font-mono text-xs text-zinc-500">Connected (Sandboxed)</span>
              </div>
            </div>

            <Button variant="outline" size="sm" className="rounded-lg">
              Update Payment Settings
            </Button>
          </Card>
        )}

        {activeTab === "funding" && (
          <Card className="p-6 text-center space-y-2">
            <Coins className="h-8 w-8 text-zinc-600 dark:text-zinc-400 mx-auto" />
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Saved Funding Opportunities
            </h2>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Run a session in Get Funding mode to match your research with foundations, programs, and grants.
            </p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
