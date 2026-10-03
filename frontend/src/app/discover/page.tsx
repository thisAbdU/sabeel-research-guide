"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  Coffee,
  BookOpen,
  Sparkles,
  MapPin,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/Card";
import { apiFetch } from "@/lib/api";
import { DISCOVER_FIELDS } from "@/lib/discover-fields";
import { SupportModal } from "@/components/discover/SupportModal";

interface DiscoverResearch {
  id: string;
  title: string;
  researcher: {
    id: string;
    name: string;
  };
  field: string | null;
  description: string | null;
  researchUrl: string | null;
  institution: string | null;
  location: string | null;
  supportEnabled: boolean;
}

interface DiscoverApiResponse {
  data: {
    research: DiscoverResearch[];
  };
}

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [selectedField, setSelectedField] = React.useState("All");
  const [items, setItems] = React.useState<DiscoverResearch[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = React.useState(0);
  const [supportTarget, setSupportTarget] = React.useState<DiscoverResearch | null>(null);

  const fields = ["All", ...DISCOVER_FIELDS];

  // Debounce search query input by ~300ms
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch published research from real backend with abort controller to avoid race conditions
  React.useEffect(() => {
    const controller = new AbortController();
    let isCancelled = false;

    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    const trimmed = debouncedQuery.trim();
    if (trimmed) {
      params.set("q", trimmed);
    }
    if (selectedField !== "All") {
      params.set("field", selectedField);
    }

    const qs = params.toString();
    const endpoint = `/api/research${qs ? `?${qs}` : ""}`;

    apiFetch<DiscoverApiResponse>(endpoint, { signal: controller.signal })
      .then((res) => {
        if (!isCancelled) {
          setItems(res.data?.research ?? []);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isCancelled || controller.signal.aborted) return;
        const msg = err instanceof Error ? err.message : "Something went wrong while loading research.";
        setError(msg);
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [debouncedQuery, selectedField, retryTrigger]);

  return (
    <AppShell>
      <div className="space-y-6 pb-12">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200/80 pb-6 dark:border-zinc-800">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl dark:text-zinc-50">
              Discover Research
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl">
              Curated research published by scholars using ScholarXiv Research Companion. Support researchers directly with voluntary contributions.
            </p>
          </div>

          <Link href="/chat">
            <Button size="sm" className="gap-2 shrink-0 rounded-lg">
              <Sparkles className="h-4 w-4" />
              Publish Your Research
            </Button>
          </Link>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, author, keyword, or institution..."
              className="h-10 w-full rounded-xl border border-zinc-200/90 bg-white pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {fields.map((field) => (
              <button
                key={field}
                onClick={() => setSelectedField(field)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors shrink-0 ${
                  selectedField === field
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
                }`}
              >
                {field}
              </button>
            ))}
          </div>
        </div>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 animate-pulse space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="h-5 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-3 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded" />
                </div>
                <div className="h-20 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl" />
                <div className="flex items-center justify-between pt-2">
                  <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                  <div className="h-8 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="rounded-2xl border border-red-200/80 bg-red-50/50 p-8 text-center dark:border-red-900/40 dark:bg-red-950/20 my-6">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              {error}
            </p>
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              Could not load research projects. Please check your connection or try again.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRetryTrigger((prev) => prev + 1)}
              className="mt-4 rounded-lg text-xs"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-200 p-12 text-center dark:border-zinc-800 my-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 mb-3">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {debouncedQuery.trim() || selectedField !== "All"
                ? "No published research found matching your criteria"
                : "No published research available yet"}
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
              {debouncedQuery.trim() || selectedField !== "All"
                ? "Try searching for different keywords or clear the field filter."
                : "Research will appear here once authors choose to publish their work."}
            </p>
            {(debouncedQuery.trim() || selectedField !== "All") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedField("All");
                }}
                className="mt-4 rounded-lg text-xs"
              >
                Clear filters
              </Button>
            )}
          </div>
        )}

        {/* Real Research Cards Grid */}
        {!isLoading && !error && items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {items.map((item) => (
              <Card key={item.id} className="flex flex-col hover:border-zinc-300 transition-colors">
                <CardHeader className="space-y-2 pb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
                      {item.field || "General Research"}
                    </span>
                    {item.supportEnabled && (
                      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                        Support Active
                      </span>
                    )}
                  </div>

                  <div>
                    <CardTitle className="text-base font-semibold leading-snug line-clamp-2">
                      {item.title}
                    </CardTitle>
                    <div className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                      <span className="font-medium text-zinc-900 dark:text-zinc-200">
                        {item.researcher?.name || "Researcher"}
                      </span>
                      {item.institution && (
                        <>
                          <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">·</span>
                          <span>{item.institution}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {item.location && (
                    <div className="flex items-center text-[11px] text-zinc-500">
                      <span className="inline-flex items-center text-zinc-400">
                        <MapPin className="h-3 w-3 mr-0.5" />
                        {item.location}
                      </span>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="pt-0 pb-3">
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400 line-clamp-4">
                    {item.description || "No description provided."}
                  </div>
                </CardContent>

                <CardFooter className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800/80">
                  {item.researchUrl ? (
                    <a
                      href={item.researchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-lg">
                        <BookOpen className="h-3.5 w-3.5" />
                        View Research
                      </Button>
                    </a>
                  ) : (
                    <Button variant="outline" size="sm" disabled className="gap-1.5 text-xs rounded-lg opacity-50 cursor-not-allowed">
                      <BookOpen className="h-3.5 w-3.5" />
                      View Research
                    </Button>
                  )}

                  {item.supportEnabled ? (
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-1.5 text-xs rounded-lg"
                      onClick={() => setSupportTarget(item)}
                    >
                      <Coffee className="h-3.5 w-3.5" />
                      <span>Support</span>
                    </Button>
                  ) : null}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Informational footer notice */}
        <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center dark:border-zinc-800 mt-6">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            Discover only displays research that authors have explicitly chosen to publish. External ScholarXiv search results remain on ScholarXiv.
          </p>
        </div>

        <SupportModal
          open={!!supportTarget}
          researchId={supportTarget?.id ?? ""}
          researchTitle={supportTarget?.title ?? ""}
          onClose={() => setSupportTarget(null)}
        />
      </div>
    </AppShell>
  );
}

