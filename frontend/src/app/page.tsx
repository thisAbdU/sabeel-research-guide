import Link from "next/link";
import {
  Sparkles,
  Flame,
  Coins,
  Compass,
  ArrowRight,
  BookOpen,
  Coffee,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[#fcfcfd] dark:bg-zinc-950">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          {/* Main Title */}
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-6xl dark:text-zinc-50">
            From vague ideas to <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-500 bg-clip-text text-transparent dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-500">
              funded, discoverable research.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg dark:text-zinc-400">
            Your voice-enabled AI research partner. Clarify interests with{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">Vent</span>,
            sharpen hypotheses with{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">Roast</span>,
            find potential grant organizations with{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">Get Funding</span>,
            and share your work on{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">Discover</span>.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/chat">
              <Button size="lg" className="w-full sm:w-auto px-7 gap-2 shadow-sm rounded-xl">
                <Sparkles className="h-4 w-4" />
                Start Researching
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/discover">
              <Button variant="outline" size="lg" className="w-full sm:w-auto px-7 gap-2 rounded-xl">
                <Compass className="h-4 w-4" />
                Browse Discover
              </Button>
            </Link>
          </div>

          {/* Clean Workflow Sequence */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-500">
            <span className="font-medium text-zinc-400 mr-1">Workflow:</span>
            <span className="text-zinc-700 dark:text-zinc-300 font-medium">Vent</span>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <span className="text-zinc-700 dark:text-zinc-300 font-medium">Roast</span>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <span className="text-zinc-700 dark:text-zinc-300 font-medium">ScholarXiv Grounding</span>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <span className="text-zinc-700 dark:text-zinc-300 font-medium">Get Funding</span>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <span className="text-zinc-700 dark:text-zinc-300 font-medium">Discover & Support</span>
          </div>
        </div>

        {/* Visual Preview Shell Card */}
        <div className="mx-auto mt-12 max-w-4xl px-4 sm:px-6">
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-md dark:border-zinc-800 dark:bg-zinc-900/90">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 px-3 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  <div className="h-3 w-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  <div className="h-3 w-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                </div>
                <span className="ml-2 font-mono text-xs text-zinc-400">
                  scholarxiv-companion
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium text-zinc-500">
                <span className="text-zinc-900 dark:text-zinc-100 font-semibold border-b-2 border-zinc-900 dark:border-zinc-100 pb-0.5">
                  Vent
                </span>
                <span>Roast</span>
                <span>Funding</span>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {/* User Prompt Mock */}
              <div className="flex items-start gap-3 justify-end">
                <div className="max-w-md rounded-xl bg-zinc-900 px-4 py-3 text-sm text-white dark:bg-zinc-100 dark:text-zinc-950">
                  &ldquo;I want to research AI and education, but I don&apos;t know where to begin.&rdquo;
                </div>
              </div>

              {/* Companion Response Mock */}
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex-1 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200 space-y-3">
                  <p>
                    Let&apos;s narrow down your focus. To build a solid research question, we need to specify:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                    <li>Target population (e.g. university undergrads vs primary school teachers)</li>
                    <li>Specific AI technology (e.g. LLM tutors vs automated grading)</li>
                    <li>Context or region (e.g. Jimma or Addis Ababa, Ethiopia)</li>
                  </ul>
                  {/* ScholarXiv Source Card Preview */}
                  <div className="mt-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700/60 dark:bg-zinc-800/80">
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span className="font-mono text-zinc-600 dark:text-zinc-300">
                        ScholarXiv Grounding
                      </span>
                      <span>cs.AI / 2024</span>
                    </div>
                    <p className="mt-1 font-medium text-xs text-zinc-900 dark:text-zinc-100">
                      Evaluation of LLM-Assisted Learning Interventions in Sub-Saharan Universities
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars Grid */}
      <section className="border-t border-zinc-200/80 bg-zinc-50/50 py-16 dark:border-zinc-800 dark:bg-zinc-900/20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
              A Research Partner for Every Stage
            </h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
              Built specifically to address the primary bottlenecks in academic research.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Pillar 1: Vent */}
            <Card className="hover:border-zinc-300 transition-colors">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 mb-2">
                  <Sparkles className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">Vent</CardTitle>
                <CardDescription className="text-xs">
                  For when you have an area of interest but no formulated question. Clarifies objectives and pulls relevant literature from ScholarXiv.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Pillar 2: Roast */}
            <Card className="hover:border-zinc-300 transition-colors">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 mb-2">
                  <Flame className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">Roast</CardTitle>
                <CardDescription className="text-xs">
                  Playful yet rigorous critique. Exposes ambiguous variables, missing populations, and delivers a defensible research question.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Pillar 3: Get Funding */}
            <Card className="hover:border-zinc-300 transition-colors">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 mb-2">
                  <Coins className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">Get Funding</CardTitle>
                <CardDescription className="text-xs">
                  Matches your research profile with foundations, grant programs, and institutional calls, backed by verified links and rationale.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Pillar 4: Discover & Support */}
            <Card className="hover:border-zinc-300 transition-colors">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 mb-2">
                  <Coffee className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">Discover & Support</CardTitle>
                <CardDescription className="text-xs">
                  Intentionally publish your completed work to the public directory and allow readers to support your work with direct tips.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-200 py-8 text-center text-xs text-zinc-500 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">ScholarXiv Companion</span>
            <span>—</span>
            <span>No rights Reserved!</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/chat" className="hover:underline">Chatbot</Link>
            <Link href="/discover" className="hover:underline">Discover</Link>
            <Link href="/dashboard" className="hover:underline">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
