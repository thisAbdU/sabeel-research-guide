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
import { apiFetch } from "@/lib/api";

type DashboardResearch = {
  id: string;
  title: string;
  field: string | null;
  visibility: "public" | "private";
  supportEnabled: boolean;
  updatedAt: string;
};

type DashboardResponse = {
  data: {
    stats: {
      publishedWorks: number;
      draftIdeas: number;
      fundingMatches: number;
      tipsReceived: number;
      tipsCurrency: string;
    };
    research: DashboardResearch[];
  };
};

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = React.useState<"research" | "support" | "funding">("research");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState({
    publishedWorks: 0,
    draftIdeas: 0,
    fundingMatches: 0,
    tipsReceived: 0,
    tipsCurrency: "ETB",
  });
  const [research, setResearch] = React.useState<DashboardResearch[]>([]);
  const [actionBusy, setActionBusy] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<DashboardResponse>("/api/dashboard");
      setStats(res.data.stats);
      setResearch(res.data.research ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  React.useEffect(() => {
    if (user) void load();
  }, [user, load]);

  const unpublish = async (id: string) => {
    setActionBusy(id);
    try {
      await apiFetch(`/api/research/${id}/unpublish`, {
        method: "POST",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unpublish failed");
    } finally {
      setActionBusy(null);
    }
  };

  const publish = async (id: string) => {
    setActionBusy(id);
    try {
      await apiFetch(`/api/research/${id}/publish`, {
        method: "POST",
        body: JSON.stringify({ confirm: true }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed — configure payment details first");
    } finally {
      setActionBusy(null);
    }
  };

  if (authLoading || !user) {
    return (
      <AppShell>
        <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      </AppShell>
    );
  }

  const statCards = [
    {
      title: "Published Works",
      value: String(stats.publishedWorks),
      icon: Globe,
      desc: "Live on Discover",
    },
    {
      title: "Draft Ideas",
      value: String(stats.draftIdeas),
      icon: FileText,
      desc: "Private to you",
    },
    {
      title: "Funding Matches",
      value: String(stats.fundingMatches),
      icon: Coins,
      desc: "Found via Companion",
    },
    {
      title: "Tips Received",
      value: `${stats.tipsReceived} ${stats.tipsCurrency}`,
      icon: Coffee,
      desc: "Via Links.et support",
    },
  ];

  return (
    <AppShell>
      <div className="space-y-8 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 pb-6 dark:border-zinc-800">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl dark:text-zinc-50">
              Researcher Dashboard
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Manage your private research drafts, public Discover submissions, and Links.et support settings.
            </p>
          </div>

          <Link href="/chat">
            <Button size="sm" className="gap-2 rounded-lg">
              <Sparkles className="h-4 w-4" />
              New AI Research Session
            </Button>
          </Link>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.title} className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {stat.title}
                </span>
                <stat.icon className="h-4 w-4 text-zinc-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {loading ? "—" : stat.value}
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">{stat.desc}</p>
            </Card>
          ))}
        </div>

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

            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
              </div>
            ) : research.length === 0 ? (
              <Card className="p-8 text-center text-xs text-zinc-500">
                No research drafts yet. Finish a Get Funding session and publish a ScholarXiv link.
              </Card>
            ) : (
              <div className="space-y-3">
                {research.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                          {item.title}
                        </span>
                        {item.visibility === "public" ? (
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
                        <span>{item.field || "General Research"}</span>
                        <span>·</span>
                        <span>Updated {relativeTime(item.updatedAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.visibility === "public" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-red-600 dark:text-red-400 rounded-lg"
                          disabled={actionBusy === item.id}
                          onClick={() => void unpublish(item.id)}
                        >
                          Unpublish
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          className="text-xs rounded-lg"
                          disabled={actionBusy === item.id}
                          onClick={() => void publish(item.id)}
                        >
                          Publish to Discover
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "support" && (
          <Card className="p-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Links.et Tip Configuration
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Payment details are collected when you publish a ScholarXiv paper from Get Funding. Tips are verified via Links.et.
              </p>
            </div>
            <Link href="/chat">
              <Button variant="outline" size="sm" className="rounded-lg">
                Start Get Funding session
              </Button>
            </Link>
          </Card>
        )}

        {activeTab === "funding" && (
          <Card className="p-6 text-center space-y-2">
            <Coins className="h-8 w-8 text-zinc-600 dark:text-zinc-400 mx-auto" />
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Saved Funding Opportunities
            </h2>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {stats.fundingMatches > 0
                ? `You have ${stats.fundingMatches} saved funding match${stats.fundingMatches === 1 ? "" : "es"}.`
                : "Run a session in Get Funding mode to match your research with foundations, programs, and grants."}
            </p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
