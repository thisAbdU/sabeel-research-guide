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
  ExternalLink,
  Trash2,
  Trophy,
  Heart,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import {
  listFundingMatches,
  removeFundingMatch,
  type FundingMatch,
  type TopSupporter,
} from "@/services/funding";

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
      privateProjects: number;
      fundingMatches: number;
      tipsReceived: number;
      tipsCurrency: string;
    };
    research: DashboardResearch[];
    fundingMatches?: FundingMatch[];
    topSupporters?: TopSupporter[];
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

function formatAmount(amount: number, currency: string): string {
  const rounded = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `${rounded} ${currency.toUpperCase()}`;
}

function TopSupportersPanel({
  supporters,
  loading,
}: {
  supporters: TopSupporter[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (supporters.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 px-5 py-7 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
        <Heart className="mx-auto h-5 w-5 text-zinc-400" />
        <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          No supporters yet
        </p>
        <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
          When people tip your published research on Discover, the top five will appear here.
        </p>
      </div>
    );
  }

  return (
    <ol className="space-y-2">
      {supporters.map((s, index) => {
        const rank = index + 1;
        const isTop = rank === 1;
        return (
          <li
            key={`${s.displayName}-${s.supportedAt}-${rank}`}
            className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 ${
              isTop
                ? "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/80"
                : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                isTop
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {rank}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {s.displayName}
                </span>
                {isTop && (
                  <Trophy className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
                )}
              </div>
              <p className="text-[11px] text-zinc-500">
                Supported {relativeTime(s.supportedAt)}
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {formatAmount(s.amount, s.currency)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = React.useState<"research" | "support" | "funding">("research");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState({
    publishedWorks: 0,
    privateProjects: 0,
    fundingMatches: 0,
    tipsReceived: 0,
    tipsCurrency: "ETB",
  });
  const [research, setResearch] = React.useState<DashboardResearch[]>([]);
  const [fundingMatches, setFundingMatches] = React.useState<FundingMatch[]>([]);
  const [topSupporters, setTopSupporters] = React.useState<TopSupporter[]>([]);
  const [actionBusy, setActionBusy] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, funding] = await Promise.all([
        apiFetch<DashboardResponse>("/api/dashboard"),
        listFundingMatches(),
      ]);
      setStats(dash.data.stats);
      setResearch(dash.data.research ?? []);
      setTopSupporters(dash.data.topSupporters ?? []);
      // Prefer dedicated /api/funding list so bookmarks always match the save API.
      const fromFundingApi = funding.matches ?? [];
      setFundingMatches(
        fromFundingApi.length > 0 ? fromFundingApi : dash.data.fundingMatches ?? [],
      );
      setStats((prev) => ({
        ...prev,
        ...dash.data.stats,
        fundingMatches:
          fromFundingApi.length > 0
            ? fromFundingApi.length
            : dash.data.stats.fundingMatches,
      }));
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

  const removeMatch = async (id: string) => {
    setActionBusy(id);
    try {
      await removeFundingMatch(id);
      setFundingMatches((prev) => prev.filter((m) => m.id !== id));
      setStats((prev) => ({
        ...prev,
        fundingMatches: Math.max(0, prev.fundingMatches - 1),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove saved funder");
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
      title: "Published",
      value: String(stats.publishedWorks),
      icon: Globe,
      desc: "Live on Discover",
    },
    {
      title: "Private",
      value: String(stats.privateProjects),
      icon: FileText,
      desc: "Only visible to you",
    },
    {
      title: "Saved Funders",
      value: String(stats.fundingMatches),
      icon: Coins,
      desc: "Bookmarked from Companion",
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
              Manage published research, saved funders, and Links.et tip settings.
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

        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("research")}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "research"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            My Research
          </button>
          <button
            onClick={() => setActiveTab("support")}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "support"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            Support & Tips
          </button>
          <button
            onClick={() => setActiveTab("funding")}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "funding"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            Saved Funders
          </button>
        </div>

        {activeTab === "research" && (
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                  Research Projects
                </h2>
                <span className="text-xs text-zinc-400 text-right">
                  Private by default until you publish to Discover.
                </span>
              </div>

              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                </div>
              ) : research.length === 0 ? (
                <Card className="p-8 text-center text-xs text-zinc-500">
                  No research yet. Finish a Get Funding session and publish a ScholarXiv link.
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
                              Private
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

            <div className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                    Top Supporters
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    People who tipped your published research — ranked by total support.
                  </p>
                </div>
                {!loading && topSupporters.length > 0 && (
                  <span className="text-[11px] text-zinc-400 tabular-nums">
                    Top {topSupporters.length}
                  </span>
                )}
              </div>
              <TopSupportersPanel supporters={topSupporters} loading={loading} />
            </div>
          </div>
        )}

        {activeTab === "support" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Card className="p-6 space-y-4 lg:col-span-2">
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Tip settings
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Payment details are collected when you publish a ScholarXiv paper from Get Funding.
                  Tips are verified via Links.et.
                </p>
              </div>
              <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                Received so far:{" "}
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {loading ? "—" : formatAmount(stats.tipsReceived, stats.tipsCurrency)}
                </span>
              </div>
              <Link href="/chat">
                <Button variant="outline" size="sm" className="rounded-lg">
                  Start Get Funding session
                </Button>
              </Link>
            </Card>

            <div className="lg:col-span-3 space-y-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                  Top 5 Supporters
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Your strongest backers across all published research.
                </p>
              </div>
              <TopSupportersPanel supporters={topSupporters} loading={loading} />
            </div>
          </div>
        )}

        {activeTab === "funding" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                  Saved Funders
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Bookmarks from Get Funding sessions, loaded from your account.
                </p>
              </div>
              <Link href="/chat">
                <Button variant="outline" size="sm" className="rounded-lg">
                  Find more funders
                </Button>
              </Link>
            </div>

            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
              </div>
            ) : fundingMatches.length === 0 ? (
              <Card className="p-8 text-center space-y-2">
                <Coins className="h-8 w-8 text-zinc-600 dark:text-zinc-400 mx-auto" />
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  No saved funders yet
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Run Get Funding, open a funder card, and tap the bookmark to save it here.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {fundingMatches.map((match) => (
                  <div
                    key={match.id}
                    className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                        {match.organizationName}
                      </div>
                      {match.programName && (
                        <div className="text-xs text-zinc-600 dark:text-zinc-400">
                          {match.programName}
                        </div>
                      )}
                      {match.relevanceNote && (
                        <p className="text-xs text-zinc-500 line-clamp-2">
                          {match.relevanceNote}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                        {match.researchTitle && (
                          <span className="truncate max-w-[220px]">
                            For: {match.researchTitle}
                          </span>
                        )}
                        <span>Saved {relativeTime(match.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {match.url && (
                        <a
                          href={match.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm" className="rounded-lg gap-1.5 text-xs">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open
                          </Button>
                        </a>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-lg text-xs text-red-600 dark:text-red-400"
                        disabled={actionBusy === match.id}
                        onClick={() => void removeMatch(match.id)}
                      >
                        {actionBusy === match.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
