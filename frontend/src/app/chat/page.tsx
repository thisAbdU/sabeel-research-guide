"use client";

import * as React from "react";
import {
  Sparkles,
  Flame,
  Coins,
  Send,
  Mic,
  BookOpen,
  Info,
  ChevronDown,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type ChatMode = "vent" | "roast" | "funding";

export default function ChatPage() {
  const [currentMode, setCurrentMode] = React.useState<ChatMode>("vent");
  const [inputValue, setInputValue] = React.useState("");

  const modeDescriptions: Record<
    ChatMode,
    { title: string; subtitle: string; icon: any; placeholder: string; starterQuestions: string[] }
  > = {
    vent: {
      title: "Vent",
      subtitle: "You don't need a polished question. Tell me what topic or problem interests you.",
      icon: Sparkles,
      placeholder: "Describe a broad interest or problem (e.g. AI in higher education in Ethiopia)...",
      starterQuestions: [
        "I want to research AI in education, but I don't know where to start.",
        "Interested in fintech adoption among small business owners.",
        "How climate change impacts crop yields in rural communities.",
      ],
    },
    roast: {
      title: "Roast",
      subtitle: "Drop your research idea or working title. I'll humorously yet academically dismantle its flaws.",
      icon: Flame,
      placeholder: "Drop your research idea to roast (e.g. The impact of social media on students)...",
      starterQuestions: [
        "The impact of social media on students.",
        "AI applications in healthcare systems.",
        "A study on poverty reduction strategies in urban centers.",
      ],
    },
    funding: {
      title: "Get Funding",
      subtitle: "Describe your research or paste your abstract. We'll discover relevant organizations and programs.",
      icon: Coins,
      placeholder: "Paste your research abstract, problem, or keywords to match potential funders...",
      starterQuestions: [
        "Mobile health monitoring for maternal care in East Africa.",
        "Water sanitation IoT devices for peri-urban areas.",
        "Open-source LLMs for underrepresented African languages.",
      ],
    },
  };

  const mode = modeDescriptions[currentMode];

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-3rem)]">
        {/* Main Workspace: Chat Messages Area + Right Reference Panel */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden min-h-0">
          {/* Left / Center Chat Column */}
          <div className="lg:col-span-8 flex flex-col justify-between h-full min-h-0">
            {/* Scrollable Chat Stream */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-6 pb-4">
              {/* Active Mode Welcome Banner */}
              <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    <mode.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                      {mode.title}
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {mode.subtitle}
                    </p>
                  </div>
                </div>

                {/* Suggested Starters */}
                <div className="mt-5 space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Suggested prompts:
                  </span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {mode.starterQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => setInputValue(q)}
                        className="rounded-lg border border-zinc-200/80 bg-zinc-50/70 px-3 py-1.5 text-xs text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100 text-left transition-colors dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Day 1 Chat Placeholder Message */}
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="rounded-xl border border-zinc-200/80 bg-white p-4 text-xs text-zinc-700 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 max-w-xl">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                    ScholarXiv Companion
                  </div>
                  <p>
                    I am ready to help you research. You can switch modes anytime inside the input box below.
                  </p>
                </div>
              </div>
            </div>

            {/* Prompt Box with In-Box Mode Selector */}
            <div className="pt-2 pb-1 shrink-0">
              <div className="rounded-2xl border border-zinc-300/90 bg-white p-2.5 shadow-sm transition-all focus-within:border-zinc-600 focus-within:ring-2 focus-within:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900">
                {/* Mode Selector inside the Chat Box */}
                <div className="flex items-center justify-between px-1 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-1 bg-zinc-100/90 dark:bg-zinc-800 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setCurrentMode("vent")}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        currentMode === "vent"
                          ? "bg-white text-zinc-900 font-semibold shadow-xs dark:bg-zinc-700 dark:text-zinc-100"
                          : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      <Sparkles className="h-3 w-3 text-zinc-500" />
                      <span>Vent</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrentMode("roast")}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        currentMode === "roast"
                          ? "bg-white text-zinc-900 font-semibold shadow-xs dark:bg-zinc-700 dark:text-zinc-100"
                          : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      <Flame className="h-3 w-3 text-zinc-500" />
                      <span>Roast</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrentMode("funding")}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        currentMode === "funding"
                          ? "bg-white text-zinc-900 font-semibold shadow-xs dark:bg-zinc-700 dark:text-zinc-100"
                          : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      <Coins className="h-3 w-3 text-zinc-500" />
                      <span>Get Funding</span>
                    </button>
                  </div>

                  <span className="text-[11px] text-zinc-400 hidden sm:inline">
                    {currentMode === "vent"
                      ? "Clarify research topic"
                      : currentMode === "roast"
                      ? "Critique idea & variables"
                      : "Match funding & programs"}
                  </span>
                </div>

                {/* Input Controls Row */}
                <div className="flex items-center pt-2 gap-2">
                  {/* Voxide Mic Button Placeholder */}
                  <button
                    type="button"
                    title="Voice Input (Voxide Integration)"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    <Mic className="h-4 w-4" />
                  </button>

                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={mode.placeholder}
                    className="flex-1 bg-transparent px-2 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
                  />

                  <Button
                    size="sm"
                    className="h-8 px-3.5 gap-1.5 rounded-lg shrink-0"
                    disabled={!inputValue.trim()}
                  >
                    <span>Send</span>
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <p className="mt-1.5 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
                ScholarXiv Companion grounds insights in literature. It does not replace academic rigor.
              </p>
            </div>
          </div>

          {/* Right Panel: Referenced Papers & Details */}
          <div className="hidden lg:flex lg:col-span-4 flex-col space-y-4 h-full min-h-0">
            <Card className="flex-1 flex flex-col min-h-0">
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-zinc-500" />
                  <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                    ScholarXiv Grounding
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400 font-mono">Live</span>
              </div>
              <div className="p-4 text-xs text-zinc-500 space-y-3 overflow-y-auto flex-1">
                <div className="rounded-xl border border-dashed border-zinc-200 p-4 text-center dark:border-zinc-800">
                  <p className="text-zinc-400">
                    Papers retrieved from ScholarXiv during your session will appear here with summaries and citations.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-zinc-50/80 dark:bg-zinc-900/40 shrink-0">
              <div className="flex items-start gap-2.5">
                <Info className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Discover & Tips
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 mt-0.5">
                    After funding analysis, you can voluntarily publish your research on Discover and accept community tips.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
