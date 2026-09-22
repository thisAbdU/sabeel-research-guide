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

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedField, setSelectedField] = React.useState("All");

  const fields = ["All", "AI & Tech", "Education", "Healthcare", "Agriculture", "Economics"];

  const mockResearchItems = [
    {
      id: "res-1",
      title: "AI Adoption Factors Among University Students in Addis Ababa",
      author: "Hana Mohammed",
      institution: "Addis Ababa University",
      location: "Ethiopia",
      field: "AI & Tech",
      tags: ["AI", "Higher Ed", "LLMs"],
      date: "Sep 2026",
      abstract:
        "An empirical analysis of conversational AI adoption rates and educational outcomes among undergraduate engineering students, highlighting key behavioral patterns and study habits.",
      supportEnabled: true,
    },
    {
      id: "res-2",
      title: "Climate-Resilient Sorghum Cultivation via Low-Cost IoT Soil Sensors",
      author: "Dawit Bekele",
      institution: "Haramaya University",
      location: "Ethiopia",
      field: "Agriculture",
      tags: ["Agriculture", "IoT", "Climate"],
      date: "Aug 2026",
      abstract:
        "Evaluating the deployment of low-power wireless moisture and temperature sensors to optimize irrigation schedules in semi-arid Ethiopian agricultural zones.",
      supportEnabled: true,
    },
    {
      id: "res-3",
      title: "Telemedicine Triage Accuracy for Maternal Health in Rural Clinics",
      author: "Selamawit Tadesse",
      institution: "Jimma University",
      location: "Ethiopia",
      field: "Healthcare",
      tags: ["Health", "Maternal Care", "Telehealth"],
      date: "Aug 2026",
      abstract:
        "Assessing mobile telehealth triage protocols across 14 rural health posts to evaluate diagnostic referral speed and clinical follow-up compliance.",
      supportEnabled: true,
    },
  ];

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

        {/* Research Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {mockResearchItems.map((item) => (
            <Card key={item.id} className="flex flex-col justify-between hover:border-zinc-300 transition-colors">
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
                    {item.field}
                  </span>
                  <span className="text-zinc-400">{item.date}</span>
                </div>

                <div>
                  <CardTitle className="text-base font-semibold leading-snug line-clamp-2">
                    {item.title}
                  </CardTitle>
                  <div className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="font-medium text-zinc-900 dark:text-zinc-200">{item.author}</span>
                    <span className="mx-1.5 text-zinc-300">·</span>
                    <span>{item.institution}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                  {item.tags.map((t) => (
                    <span key={t} className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {t}
                    </span>
                  ))}
                  <span className="inline-flex items-center text-zinc-400">
                    <MapPin className="h-3 w-3 mr-0.5" />
                    {item.location}
                  </span>
                </div>
              </CardHeader>

              <CardContent>
                <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
                  {item.abstract}
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-lg">
                  <BookOpen className="h-3.5 w-3.5" />
                  Read Research
                </Button>

                <Button variant="default" size="sm" className="gap-1.5 text-xs rounded-lg">
                  <Coffee className="h-3.5 w-3.5" />
                  <span>Support</span>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Empty state placeholder notice */}
        <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center dark:border-zinc-800 mt-6">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            Discover only displays research that authors have explicitly chosen to publish. External ScholarXiv search results remain on ScholarXiv.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
